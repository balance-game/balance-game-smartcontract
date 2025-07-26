// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract BalanceGame is Ownable(msg.sender) { 
    enum VoteOpttion { A, B }

    struct Game {
        uint256 id;
        string questionA;
        string questionB;
        mapping (address => VoteOpttion) votes;
        uint256 voteCountA;
        uint256 voteCountB;
        address creator;
    }

    mapping (uint256 => Game) public findGameById;
    mapping (address => bool) public whiteList;

    event NewGame(uint256 indexed gameId);
    event NewVote(uint256 indexed gameId, uint256 indexed votedAddress, VoteOpttion indexed voteOpttion);
    event WhiteListUpdate(address indexed, bool status);

    modifier onlyWhitelisted {
        require(whiteList[msg.sender], "OnlyWhitelisted");
        _;
    }

    modifier etherCheck {   
        require(msg.value > 10000 wei, "Not Enough Ether");
        _;
    }
} 