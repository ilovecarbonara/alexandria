// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract ThesisRegistry {
    struct ThesisRecord {
        bytes32 sha256Hash;
        string submissionType;
        string thesisLevel;
        string thesisCategory;
        uint256 timestamp;
        address registeredBy;
    }

    address public owner;

    mapping(bytes32 => ThesisRecord) private theses;

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    event ThesisRegistered(
        bytes32 indexed sha256Hash,
        address indexed registeredBy,
        uint256 indexed timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");

        address previousOwner = owner;
        owner = newOwner;

        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function registerThesis(
        bytes32 _sha256Hash,
        string calldata _submissionType,
        string calldata _thesisLevel,
        string calldata _thesisCategory
    ) external onlyOwner {
        require(_sha256Hash != bytes32(0), "Hash cannot be empty");
        require(!isRegistered(_sha256Hash), "Thesis already registered");

        theses[_sha256Hash] = ThesisRecord({
            sha256Hash: _sha256Hash,
            submissionType: _submissionType,
            thesisLevel: _thesisLevel,
            thesisCategory: _thesisCategory,
            timestamp: block.timestamp,
            registeredBy: msg.sender
        });

        emit ThesisRegistered(_sha256Hash, msg.sender, block.timestamp);
    }

    function getThesis(
        bytes32 _sha256Hash
    ) external view returns (ThesisRecord memory) {
        require(isRegistered(_sha256Hash), "Thesis not found");
        return theses[_sha256Hash];
    }

    function isRegistered(
        bytes32 _sha256Hash
    ) public view returns (bool) {
        return theses[_sha256Hash].timestamp != 0;
    }
}
