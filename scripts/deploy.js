const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying LuminexVault to Somnia...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy LuminexVault
  const LuminexVault = await ethers.getContractFactory("LuminexVault");
  const vault = await LuminexVault.deploy();

  await vault.waitForDeployment();

  const vaultAddress = await vault.getAddress();
  console.log("LuminexVault deployed to:", vaultAddress);

  // Verify deployment
  const campaignCounter = await vault.campaignCounter();
  console.log("Initial campaign counter:", campaignCounter.toString());

  // Log deployment info
  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log("Network:", network.name);
  console.log("LuminexVault:", vaultAddress);
  console.log("Deployer:", deployer.address);
  console.log("========================\n");

  // Save deployment info to file
  const fs = require("fs");
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    contracts: {
      LuminexVault: vaultAddress,
    },
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    `deployments/${network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`Deployment info saved to deployments/${network.name}.json`);

  // Create sample campaigns if on testnet
  if (network.name === "somnia" || network.name === "hardhat") {
    console.log("\nCreating sample campaigns...");

    const categories = [
      { name: "earthquake-jp", target: ethers.parseEther("100") },
      { name: "flood-tr", target: ethers.parseEther("50") },
      { name: "medical-global", target: ethers.parseEther("200") },
    ];

    for (const cat of categories) {
      const tx = await vault.createCampaign(
        cat.name,
        cat.target,
        0, // No end date
        deployer.address
      );
      await tx.wait();
      console.log(`Created campaign: ${cat.name}`);
    }

    console.log("Sample campaigns created!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
