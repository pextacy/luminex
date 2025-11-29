// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title LuminexVault
 * @notice Decentralized crowdfunding vault for the Luminex platform on Somnia
 * @dev Manages campaigns, donations, and withdrawals with full on-chain transparency
 */
contract LuminexVault is ReentrancyGuard, Ownable, Pausable {
    
    // ==========================================
    // STRUCTS
    // ==========================================
    
    struct Campaign {
        uint256 id;
        address creator;
        string category;
        uint256 targetAmount;
        uint256 totalDonations;
        uint256 donorCount;
        bool isActive;
        bool isCompleted;
        uint256 createdAt;
        uint256 endDate;
    }
    
    struct Donation {
        address donor;
        uint256 amount;
        string message;
        uint256 timestamp;
    }
    
    // ==========================================
    // STATE VARIABLES
    // ==========================================
    
    uint256 public campaignCounter;
    uint256 public totalDonationsAllTime;
    uint256 public totalDonorsAllTime;
    
    // Campaign ID => Campaign
    mapping(uint256 => Campaign) public campaigns;
    
    // Campaign ID => Donor Address => Total Contributed
    mapping(uint256 => mapping(address => uint256)) public donorContributions;
    
    // Campaign ID => Authorized Withdrawer
    mapping(uint256 => address) public campaignWithdrawers;
    
    // Platform fee (in basis points, e.g., 100 = 1%)
    uint256 public platformFee = 0; // No fee by default
    address public feeRecipient;
    
    // ==========================================
    // EVENTS
    // ==========================================
    
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        string category,
        uint256 targetAmount,
        uint256 endDate
    );
    
    event DonationReceived(
        uint256 indexed campaignId,
        address indexed donor,
        uint256 amount,
        string message
    );
    
    event CampaignCompleted(uint256 indexed campaignId);
    
    event CampaignPaused(uint256 indexed campaignId);
    
    event CampaignResumed(uint256 indexed campaignId);
    
    event FundsWithdrawn(
        uint256 indexed campaignId,
        address indexed to,
        uint256 amount
    );
    
    event WithdrawerUpdated(
        uint256 indexed campaignId,
        address oldWithdrawer,
        address newWithdrawer
    );
    
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    
    // ==========================================
    // MODIFIERS
    // ==========================================
    
    modifier campaignExists(uint256 campaignId) {
        require(campaigns[campaignId].id != 0, "Campaign does not exist");
        _;
    }
    
    modifier campaignActive(uint256 campaignId) {
        require(campaigns[campaignId].isActive, "Campaign is not active");
        require(!campaigns[campaignId].isCompleted, "Campaign is completed");
        require(
            campaigns[campaignId].endDate == 0 || 
            block.timestamp <= campaigns[campaignId].endDate,
            "Campaign has ended"
        );
        _;
    }
    
    modifier onlyCampaignCreator(uint256 campaignId) {
        require(
            msg.sender == campaigns[campaignId].creator,
            "Only campaign creator can perform this action"
        );
        _;
    }
    
    modifier onlyAuthorizedWithdrawer(uint256 campaignId) {
        require(
            msg.sender == campaignWithdrawers[campaignId] ||
            msg.sender == campaigns[campaignId].creator ||
            msg.sender == owner(),
            "Not authorized to withdraw"
        );
        _;
    }
    
    // ==========================================
    // CONSTRUCTOR
    // ==========================================
    
    constructor() Ownable(msg.sender) {
        feeRecipient = msg.sender;
    }
    
    // ==========================================
    // CAMPAIGN MANAGEMENT
    // ==========================================
    
    /**
     * @notice Create a new fundraising campaign
     * @param category Category of the campaign (e.g., "earthquake", "flood")
     * @param targetAmount Target amount in wei
     * @param endDate Optional end date (0 for no end date)
     * @param withdrawer Address authorized to withdraw funds
     */
    function createCampaign(
        string calldata category,
        uint256 targetAmount,
        uint256 endDate,
        address withdrawer
    ) external whenNotPaused returns (uint256) {
        require(targetAmount > 0, "Target amount must be greater than 0");
        require(bytes(category).length > 0, "Category cannot be empty");
        require(
            endDate == 0 || endDate > block.timestamp,
            "End date must be in the future"
        );
        
        campaignCounter++;
        uint256 campaignId = campaignCounter;
        
        campaigns[campaignId] = Campaign({
            id: campaignId,
            creator: msg.sender,
            category: category,
            targetAmount: targetAmount,
            totalDonations: 0,
            donorCount: 0,
            isActive: true,
            isCompleted: false,
            createdAt: block.timestamp,
            endDate: endDate
        });
        
        campaignWithdrawers[campaignId] = withdrawer != address(0) 
            ? withdrawer 
            : msg.sender;
        
        emit CampaignCreated(
            campaignId,
            msg.sender,
            category,
            targetAmount,
            endDate
        );
        
        return campaignId;
    }
    
    /**
     * @notice Pause a campaign
     * @param campaignId ID of the campaign to pause
     */
    function pauseCampaign(uint256 campaignId) 
        external 
        campaignExists(campaignId) 
        onlyCampaignCreator(campaignId) 
    {
        require(campaigns[campaignId].isActive, "Campaign already paused");
        campaigns[campaignId].isActive = false;
        emit CampaignPaused(campaignId);
    }
    
    /**
     * @notice Resume a paused campaign
     * @param campaignId ID of the campaign to resume
     */
    function resumeCampaign(uint256 campaignId) 
        external 
        campaignExists(campaignId) 
        onlyCampaignCreator(campaignId) 
    {
        require(!campaigns[campaignId].isActive, "Campaign already active");
        require(!campaigns[campaignId].isCompleted, "Campaign is completed");
        campaigns[campaignId].isActive = true;
        emit CampaignResumed(campaignId);
    }
    
    /**
     * @notice Update the authorized withdrawer for a campaign
     * @param campaignId ID of the campaign
     * @param newWithdrawer New withdrawer address
     */
    function updateWithdrawer(uint256 campaignId, address newWithdrawer) 
        external 
        campaignExists(campaignId) 
        onlyCampaignCreator(campaignId) 
    {
        require(newWithdrawer != address(0), "Invalid withdrawer address");
        address oldWithdrawer = campaignWithdrawers[campaignId];
        campaignWithdrawers[campaignId] = newWithdrawer;
        emit WithdrawerUpdated(campaignId, oldWithdrawer, newWithdrawer);
    }
    
    // ==========================================
    // DONATIONS
    // ==========================================
    
    /**
     * @notice Donate to a campaign
     * @param campaignId ID of the campaign to donate to
     * @param message Optional message from the donor
     */
    function donate(uint256 campaignId, string calldata message) 
        external 
        payable 
        nonReentrant 
        whenNotPaused
        campaignExists(campaignId) 
        campaignActive(campaignId) 
    {
        require(msg.value > 0, "Donation must be greater than 0");
        
        Campaign storage campaign = campaigns[campaignId];
        
        // Track unique donors
        if (donorContributions[campaignId][msg.sender] == 0) {
            campaign.donorCount++;
            totalDonorsAllTime++;
        }
        
        // Update state
        donorContributions[campaignId][msg.sender] += msg.value;
        campaign.totalDonations += msg.value;
        totalDonationsAllTime += msg.value;
        
        emit DonationReceived(campaignId, msg.sender, msg.value, message);
        
        // Check if target reached
        if (campaign.totalDonations >= campaign.targetAmount) {
            campaign.isCompleted = true;
            emit CampaignCompleted(campaignId);
        }
    }
    
    /**
     * @notice Batch donate to multiple campaigns
     * @param campaignIds Array of campaign IDs
     * @param amounts Array of amounts to donate to each campaign
     * @param messages Array of messages for each donation
     */
    function batchDonate(
        uint256[] calldata campaignIds,
        uint256[] calldata amounts,
        string[] calldata messages
    ) external payable nonReentrant whenNotPaused {
        require(
            campaignIds.length == amounts.length && 
            amounts.length == messages.length,
            "Array lengths must match"
        );
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        require(msg.value == totalAmount, "Incorrect total amount sent");
        
        for (uint256 i = 0; i < campaignIds.length; i++) {
            uint256 campaignId = campaignIds[i];
            require(campaigns[campaignId].id != 0, "Campaign does not exist");
            require(campaigns[campaignId].isActive, "Campaign is not active");
            require(!campaigns[campaignId].isCompleted, "Campaign is completed");
            
            Campaign storage campaign = campaigns[campaignId];
            
            if (donorContributions[campaignId][msg.sender] == 0) {
                campaign.donorCount++;
                totalDonorsAllTime++;
            }
            
            donorContributions[campaignId][msg.sender] += amounts[i];
            campaign.totalDonations += amounts[i];
            totalDonationsAllTime += amounts[i];
            
            emit DonationReceived(campaignId, msg.sender, amounts[i], messages[i]);
            
            if (campaign.totalDonations >= campaign.targetAmount) {
                campaign.isCompleted = true;
                emit CampaignCompleted(campaignId);
            }
        }
    }
    
    // ==========================================
    // WITHDRAWALS
    // ==========================================
    
    /**
     * @notice Withdraw funds from a campaign
     * @param campaignId ID of the campaign
     * @param amount Amount to withdraw
     * @param to Address to send funds to
     */
    function withdraw(uint256 campaignId, uint256 amount, address payable to) 
        external 
        nonReentrant 
        campaignExists(campaignId) 
        onlyAuthorizedWithdrawer(campaignId) 
    {
        require(amount > 0, "Amount must be greater than 0");
        require(to != address(0), "Invalid recipient address");
        
        Campaign storage campaign = campaigns[campaignId];
        require(
            amount <= campaign.totalDonations,
            "Amount exceeds available funds"
        );
        
        // Calculate fee
        uint256 fee = (amount * platformFee) / 10000;
        uint256 amountAfterFee = amount - fee;
        
        // Update state before transfer
        campaign.totalDonations -= amount;
        
        // Transfer funds
        if (fee > 0 && feeRecipient != address(0)) {
            (bool feeSuccess, ) = feeRecipient.call{value: fee}("");
            require(feeSuccess, "Fee transfer failed");
        }
        
        (bool success, ) = to.call{value: amountAfterFee}("");
        require(success, "Transfer failed");
        
        emit FundsWithdrawn(campaignId, to, amountAfterFee);
    }
    
    // ==========================================
    // VIEW FUNCTIONS
    // ==========================================
    
    /**
     * @notice Get campaign details
     * @param campaignId ID of the campaign
     */
    function getCampaign(uint256 campaignId) 
        external 
        view 
        returns (
            uint256 totalDonations,
            uint256 donorCount,
            bool isActive,
            bool isCompleted,
            uint256 targetAmount
        ) 
    {
        Campaign memory campaign = campaigns[campaignId];
        return (
            campaign.totalDonations,
            campaign.donorCount,
            campaign.isActive,
            campaign.isCompleted,
            campaign.targetAmount
        );
    }
    
    /**
     * @notice Get donor's contribution to a campaign
     * @param campaignId ID of the campaign
     * @param donor Address of the donor
     */
    function getDonorContribution(uint256 campaignId, address donor) 
        external 
        view 
        returns (uint256) 
    {
        return donorContributions[campaignId][donor];
    }
    
    /**
     * @notice Get total number of campaigns
     */
    function getTotalCampaigns() external view returns (uint256) {
        return campaignCounter;
    }
    
    /**
     * @notice Check if campaign can accept donations
     * @param campaignId ID of the campaign
     */
    function canDonate(uint256 campaignId) external view returns (bool) {
        Campaign memory campaign = campaigns[campaignId];
        if (campaign.id == 0) return false;
        if (!campaign.isActive) return false;
        if (campaign.isCompleted) return false;
        if (campaign.endDate != 0 && block.timestamp > campaign.endDate) return false;
        return true;
    }
    
    // ==========================================
    // ADMIN FUNCTIONS
    // ==========================================
    
    /**
     * @notice Update platform fee
     * @param newFee New fee in basis points (e.g., 100 = 1%)
     */
    function updatePlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee cannot exceed 10%");
        uint256 oldFee = platformFee;
        platformFee = newFee;
        emit PlatformFeeUpdated(oldFee, newFee);
    }
    
    /**
     * @notice Update fee recipient
     * @param newRecipient New fee recipient address
     */
    function updateFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid recipient address");
        feeRecipient = newRecipient;
    }
    
    /**
     * @notice Pause all contract operations
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause all contract operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Emergency withdrawal by owner
     * @param campaignId Campaign to withdraw from
     * @param to Recipient address
     */
    function emergencyWithdraw(uint256 campaignId, address payable to) 
        external 
        onlyOwner 
        campaignExists(campaignId) 
    {
        require(to != address(0), "Invalid recipient");
        uint256 amount = campaigns[campaignId].totalDonations;
        campaigns[campaignId].totalDonations = 0;
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit FundsWithdrawn(campaignId, to, amount);
    }
    
    // ==========================================
    // FALLBACK
    // ==========================================
    
    receive() external payable {
        revert("Direct deposits not allowed. Use donate()");
    }
}
