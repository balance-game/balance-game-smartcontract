// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract BalanceGame is Ownable(msg.sender) {    
    enum VoteOpttion { A, B }

    struct Game {
        uint256 id;
        string questionA;
        string questionB;
        uint256 voteCountA;
        uint256 voteCountB;
        uint256 deadline;
        address creator;
    }

    uint256 immutable public COST; // 게임 이용 비용 
    uint256 public GAMEINDEX = 0; // 게임ID 카운트

    constructor(uint256 _cost) {
        COST = _cost;
        whiteList[msg.sender] = true;
    }

    mapping (uint256 => Game) public findGameById;
    mapping (uint256 => mapping(address => bool)) voteList;
    mapping (address => bool) public whiteList;

    event NewGame(uint256 indexed gameId);
    event NewVote(uint256 indexed gameId, address indexed votedAddress, VoteOpttion indexed voteOpttion);
    event WhiteListUpdate(address indexed, bool status);

    modifier onlyWhitelist {
        require(whiteList[msg.sender], "OnlyWhitelist");
        _;
    }

    modifier etherCheck {   
        require(msg.value < COST, "Not Enough Ether");
        _;
    }

    function whitelistUpdate(address _newAddress, bool _status) public onlyOwner {
        whiteList[_newAddress] = _status;
        emit WhiteListUpdate(_newAddress, _status);
    }

    function createVote(string memory _questionA, string memory _questionB, uint256 _deadline) public payable etherCheck onlyWhitelist returns(uint256) {
        GAMEINDEX++;
        findGameById[GAMEINDEX] = Game(GAMEINDEX, _questionA, _questionB, 0, 0, _deadline, msg.sender);
        emit NewGame(GAMEINDEX);
        
        return GAMEINDEX;
    }

    function vote(uint256 _gameId, VoteOpttion _voteOption ) public payable etherCheck onlyWhitelist {
        require(findGameById[_gameId].creator != address(0) , "incorrect gameId");
        require(!voteList[_gameId][msg.sender], "already vote");

        voteList[_gameId][msg.sender] = true;
        emit NewVote(_gameId, msg.sender, _voteOption);
    }
} 