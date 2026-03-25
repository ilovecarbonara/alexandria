// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract ThesisRegistry {
    struct ThesisRecord {
        string sha256Hash;
        string submissionType;
        string thesisLevel;
        string thesisCategory;
        uint256 timestamp;
        address registeredBy;
    }

    mapping(string => ThesisRecord) private theses;

    event ThesisRegistered(
        string sha256Hash,
        address registeredBy,
        uint256 timestamp
    );

    function registerThesis(
        string calldata _sha256Hash,
        string calldata _submissionType,
        string calldata _thesisLevel,
        string calldata _thesisCategory
    ) external {
        require(bytes(_sha256Hash).length > 0, "Hash cannot be empty");
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
        string calldata _sha256Hash
    ) external view returns (ThesisRecord memory) {
        require(isRegistered(_sha256Hash), "Thesis not found");
        return theses[_sha256Hash];
    }

    function isRegistered(
        string calldata _sha256Hash
    ) public view returns (bool) {
        return theses[_sha256Hash].timestamp != 0;
    }
}
