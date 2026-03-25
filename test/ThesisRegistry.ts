import { expect } from "chai";
import hre from "hardhat";
import type { ThesisRegistry } from "../typechain-types";

describe("ThesisRegistry", function () {
  let registry: ThesisRegistry;

  beforeEach(async function () {
    const Factory = await hre.ethers.getContractFactory("ThesisRegistry");
    registry = await Factory.deploy();
  });

  describe("registerThesis", function () {
    it("should register a thesis and emit ThesisRegistered", async function () {
      const hash = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2";

      const tx = await registry.registerThesis(
        hash,
        "final",
        "undergraduate",
        "Technology",
      );

      await expect(tx).to.emit(registry, "ThesisRegistered");

      const record = await registry.getThesis(hash);
      expect(record.sha256Hash).to.equal(hash);
      expect(record.submissionType).to.equal("final");
      expect(record.thesisLevel).to.equal("undergraduate");
      expect(record.thesisCategory).to.equal("Technology");
      expect(record.timestamp).to.be.greaterThan(0);
    });

    it("should reject duplicate hash registration", async function () {
      const hash = "dup1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1";

      await registry.registerThesis(hash, "final", "undergraduate", "Technology");

      await expect(
        registry.registerThesis(hash, "draft", "masteral", "Education"),
      ).to.be.revertedWith("Thesis already registered");
    });

    it("should reject empty hash", async function () {
      await expect(
        registry.registerThesis("", "final", "undergraduate", "Technology"),
      ).to.be.revertedWith("Hash cannot be empty");
    });

    it("should allow different hashes from the same sender", async function () {
      await registry.registerThesis("hash-one", "final", "undergraduate", "Medical");
      await registry.registerThesis("hash-two", "draft", "masteral", "Law");

      expect(await registry.isRegistered("hash-one")).to.equal(true);
      expect(await registry.isRegistered("hash-two")).to.equal(true);
    });

    it("should store the correct registeredBy address", async function () {
      const [signer] = await hre.ethers.getSigners();
      const hash = "addr-test-hash";

      await registry.registerThesis(hash, "draft", "doctoral", "Medical");

      const record = await registry.getThesis(hash);
      expect(record.registeredBy).to.equal(signer.address);
    });
  });

  describe("getThesis", function () {
    it("should return the full thesis record", async function () {
      const hash = "get-test-hash";
      await registry.registerThesis(hash, "draft", "doctoral", "Engineering");

      const record = await registry.getThesis(hash);
      expect(record.sha256Hash).to.equal(hash);
      expect(record.submissionType).to.equal("draft");
      expect(record.thesisLevel).to.equal("doctoral");
      expect(record.thesisCategory).to.equal("Engineering");
      expect(record.registeredBy).to.not.equal(hre.ethers.ZeroAddress);
    });

    it("should revert for unregistered hash", async function () {
      await expect(
        registry.getThesis("nonexistent"),
      ).to.be.revertedWith("Thesis not found");
    });
  });

  describe("isRegistered", function () {
    it("should return false for unregistered hash", async function () {
      expect(await registry.isRegistered("unknown")).to.equal(false);
    });

    it("should return true after registration", async function () {
      await registry.registerThesis("check-hash", "final", "masteral", "Law");
      expect(await registry.isRegistered("check-hash")).to.equal(true);
    });
  });
});
