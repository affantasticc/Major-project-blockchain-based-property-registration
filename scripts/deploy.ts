import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting deployment...");

  const Contract = await ethers.getContractFactory("PropertyRegistration");

  const contract = await Contract.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();

  console.log("✅ Contract deployed at:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});