
 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PropertyRegistration {
    address public admin;
    uint public propertyCount;

    struct Property {
        uint id;
        string name;
        string location;
        uint area;
        string documentCID;
        address owner;
        uint registeredAt;
    }

    struct TransferRecord {
        address from;
        address to;
        string reason;
        uint timestamp;
    }

    struct Nominee {
        address wallet;
        string name;
        uint share;
        string relation;
    }

    mapping(uint => Property) public properties;
    mapping(uint => TransferRecord[]) private transferHistory;
    mapping(uint => Nominee[]) private nominees;
    mapping(uint => string) public wills;

    event PropertyRegistered(
        uint indexed propertyId,
        string name,
        address owner,
        uint timestamp
    );

    event OwnershipTransferred(
        uint indexed propertyId,
        address from,
        address to,
        string reason
    );

    event InheritanceExecuted(
        uint indexed propertyId,
        address newOwner,
        string mode
    );

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Admin only");
        _;
    }

    modifier validProperty(uint id) {
        require(id > 0 && id <= propertyCount, "Property does not exist");
        _;
    }

    // Register property using all five frontend values.
    function registerProperty(
        string memory _name,
        string memory _location,
        uint _area,
        string memory _documentCID,
        address _owner
    ) public onlyAdmin {
        require(bytes(_name).length > 0, "Name required");
        require(bytes(_location).length > 0, "Location required");
        require(_area > 0, "Area must be positive");
        require(_owner != address(0), "Invalid owner");

        propertyCount++;

        properties[propertyCount] = Property({
            id: propertyCount,
            name: _name,
            location: _location,
            area: _area,
            documentCID: _documentCID,
            owner: _owner,
            registeredAt: block.timestamp
        });

        emit PropertyRegistered(
            propertyCount,
            _name,
            _owner,
            block.timestamp
        );
    }

    function getProperty(
        uint _id
    ) public view validProperty(_id) returns (Property memory) {
        return properties[_id];
    }

    function getMyProperties(
        address _owner
    ) public view returns (uint[] memory) {
        uint count;

        for (uint i = 1; i <= propertyCount; i++) {
            if (properties[i].owner == _owner) count++;
        }

        uint[] memory ids = new uint[](count);
        uint index;

        for (uint i = 1; i <= propertyCount; i++) {
            if (properties[i].owner == _owner) {
                ids[index++] = i;
            }
        }

        return ids;
    }

    function transferProperty(
        uint _id,
        address _newOwner,
        string memory _reason
    ) public validProperty(_id) {
        require(properties[_id].owner == msg.sender, "Not owner");
        require(_newOwner != address(0), "Invalid new owner");

        address oldOwner = properties[_id].owner;
        properties[_id].owner = _newOwner;

        transferHistory[_id].push(
            TransferRecord({
                from: oldOwner,
                to: _newOwner,
                reason: _reason,
                timestamp: block.timestamp
            })
        );

        emit OwnershipTransferred(
            _id,
            oldOwner,
            _newOwner,
            _reason
        );
    }

    function getTransferHistory(
        uint _id
    ) public view validProperty(_id)
        returns (TransferRecord[] memory)
    {
        return transferHistory[_id];
    }

    function assignNominee(
        uint _id,
        address _wallet,
        string memory _name,
        uint _share,
        string memory _relation
    ) public validProperty(_id) {
        require(properties[_id].owner == msg.sender, "Not owner");
        require(_wallet != address(0), "Invalid nominee");
        require(_share > 0 && _share <= 100, "Invalid share");

        uint total;

        for (uint i = 0; i < nominees[_id].length; i++) {
            total += nominees[_id][i].share;
        }

        require(total + _share <= 100, "Shares exceed 100%");

        nominees[_id].push(
            Nominee({
                wallet: _wallet,
                name: _name,
                share: _share,
                relation: _relation
            })
        );
    }

    function uploadWill(
        uint _id,
        string memory _cid
    ) public validProperty(_id) {
        require(properties[_id].owner == msg.sender, "Not owner");
        require(bytes(_cid).length > 0, "CID required");

        wills[_id] = _cid;
    }

    // Prototype only, not a legally automated inheritance process.
    // Selects the first nominee, or the first supplied legal heir.
    function executeInheritance(
        uint _id,
        address[] memory _heirs,
        uint[] memory _shares
    ) public onlyAdmin validProperty(_id) {
        require(_heirs.length == _shares.length, "Array length mismatch");

        address newOwner;
        string memory mode;

        if (nominees[_id].length > 0) {
            newOwner = nominees[_id][0].wallet;
            mode = "Nominee";
        } else {
            require(_heirs.length > 0, "No heirs supplied");

            uint totalShares;

            for (uint i = 0; i < _shares.length; i++) {
                require(_heirs[i] != address(0), "Invalid heir");
                totalShares += _shares[i];
            }

            require(totalShares == 100, "Heir shares must total 100");

            newOwner = _heirs[0];
            mode = bytes(wills[_id]).length > 0
                ? "Will recorded, first heir selected"
                : "Legal Heir";
        }

        properties[_id].owner = newOwner;

        emit InheritanceExecuted(_id, newOwner, mode);
    }
}
