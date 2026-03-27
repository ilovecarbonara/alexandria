import hre from "hardhat";

async function main() {
  const ThesisRegistry = await hre.ethers.getContractFactory("ThesisRegistry");
  const registry = await ThesisRegistry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log(`ThesisRegistry deployed to: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});