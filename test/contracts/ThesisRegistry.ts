import { expect } from "chai";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs.js";
import hre from "hardhat";
import type { ThesisRegistry } from "../../typechain-types";

type HardhatSigner = Awaited<ReturnType<typeof hre.ethers.getSigners>>[number];

describe("ThesisRegistry", function () {
  let registry: ThesisRegistry;
  let owner: HardhatSigner;
  let nonOwner: HardhatSigner;
  let newOwner: HardhatSigner;

  const hashFor = (value: string) => hre.ethers.sha256(hre.ethers.toUtf8Bytes(value));

  beforeEach(async function () {
    [owner, nonOwner, newOwner] = await hre.ethers.getSigners();

    const Factory = await hre.ethers.getContractFactory("ThesisRegistry");
    registry = await Factory.deploy();
  });

  describe("registerThesis", function () {
    it("should register a thesis and emit ThesisRegistered", async function () {
      const hash = hashFor("register thesis");

      const tx = await registry.registerThesis(
        hash,
        "final",
        "undergraduate",
        "Technology",
      );

      await expect(tx)
        .to.emit(registry, "ThesisRegistered")
        .withArgs(hash, owner.address, anyValue);

      const record = await registry.getThesis(hash);
      expect(record.sha256Hash).to.equal(hash);
      expect(record.submissionType).to.equal("final");
      expect(record.thesisLevel).to.equal("undergraduate");
      expect(record.thesisCategory).to.equal("Technology");
      expect(record.timestamp).to.be.greaterThan(0);
    });

    it("should reject duplicate hash registration", async function () {
      const hash = hashFor("duplicate thesis");

      await registry.registerThesis(hash, "final", "undergraduate", "Technology");

      await expect(
        registry.registerThesis(hash, "draft", "masteral", "Education"),
      ).to.be.revertedWith("Thesis already registered");
    });

    it("should reject empty hash", async function () {
      await expect(
        registry.registerThesis(hre.ethers.ZeroHash, "final", "undergraduate", "Technology"),
      ).to.be.revertedWith("Hash cannot be empty");
    });

    it("should reject registration from a non-owner", async function () {
      await expect(
        registry
          .connect(nonOwner)
          .registerThesis(hashFor("non owner thesis"), "final", "undergraduate", "Technology"),
      ).to.be.revertedWith("Not authorized");
    });

    it("should allow different hashes from the same sender", async function () {
      const firstHash = hashFor("hash one");
      const secondHash = hashFor("hash two");

      await registry.registerThesis(firstHash, "final", "undergraduate", "Medical");
      await registry.registerThesis(secondHash, "draft", "masteral", "Law");

      expect(await registry.isRegistered(firstHash)).to.equal(true);
      expect(await registry.isRegistered(secondHash)).to.equal(true);
    });

    it("should store the correct registeredBy address", async function () {
      const hash = hashFor("registered by thesis");

      await registry.registerThesis(hash, "draft", "doctoral", "Medical");

      const record = await registry.getThesis(hash);
      expect(record.registeredBy).to.equal(owner.address);
    });
  });

  describe("getThesis", function () {
    it("should return the full thesis record", async function () {
      const hash = hashFor("get thesis");
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
        registry.getThesis(hashFor("nonexistent")),
      ).to.be.revertedWith("Thesis not found");
    });
  });

  describe("isRegistered", function () {
    it("should return false for unregistered hash", async function () {
      expect(await registry.isRegistered(hashFor("unknown"))).to.equal(false);
    });

    it("should return true after registration", async function () {
      const hash = hashFor("check hash");

      await registry.registerThesis(hash, "final", "masteral", "Law");
      expect(await registry.isRegistered(hash)).to.equal(true);
    });
  });

  describe("ownership", function () {
    it("should set the deployer as owner", async function () {
      expect(await registry.owner()).to.equal(owner.address);
    });

    it("should transfer ownership", async function () {
      const tx = await registry.transferOwnership(newOwner.address);

      await expect(tx)
        .to.emit(registry, "OwnershipTransferred")
        .withArgs(owner.address, newOwner.address);

      expect(await registry.owner()).to.equal(newOwner.address);
    });

    it("should reject ownership transfer to the zero address", async function () {
      await expect(
        registry.transferOwnership(hre.ethers.ZeroAddress),
      ).to.be.revertedWith("New owner cannot be zero address");
    });

    it("should reject ownership transfer from a non-owner", async function () {
      await expect(
        registry.connect(nonOwner).transferOwnership(newOwner.address),
      ).to.be.revertedWith("Not authorized");
    });

    it("should update registration privileges after ownership transfer", async function () {
      const hash = hashFor("new owner thesis");

      await registry.transferOwnership(newOwner.address);

      await expect(
        registry.registerThesis(hash, "final", "undergraduate", "Technology"),
      ).to.be.revertedWith("Not authorized");

      await registry
        .connect(newOwner)
        .registerThesis(hash, "final", "undergraduate", "Technology");

      const record = await registry.getThesis(hash);
      expect(record.registeredBy).to.equal(newOwner.address);
    });
  });
});
