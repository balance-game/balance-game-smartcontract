// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract BalanceGame is Ownable {    
    constructor(uint256 _cost) Ownable(msg.sender) {
        COST = _cost;
        whiteList[msg.sender] = true;
    }

    enum VoteOpttion { A, B }

    struct Game {
        uint256 id;
        string questionA;
        string questionB;
        uint256 voteCountA;
        uint256 voteCountB;
        address[] votedList;
        uint256 totalETH;
        uint256 createAt;
        uint256 deadline;
        address creator;
    }

    uint256 immutable public COST; // 게임 이용 s비용 
    uint256 public GAMEINDEX = 0; // 게임ID 카운트

    mapping (uint256 => Game) public findGameById; // 게임 정보 조회
    mapping (uint256 => mapping(address => bool)) voteCheck; // 투표 유무 체크
    mapping (address => bool) public isContinue; // 연속 당첨 판별
    mapping (address => bool) public whiteList; // 화이트리스트

    event NewGame(uint256 indexed gameId, string questionA, string questionB, uint256 createdAt, uint256 deadline, address indexed creator);
    event NewVote(uint256 indexed gameId, address indexed votedAddress, VoteOpttion indexed voteOpttion, uint256 votedAt);
    event WhiteListUpdate(address indexed, bool status);

    modifier onlyWhitelist {
        require(whiteList[msg.sender], "only use Whitelist");
        _;
    }

    modifier etherCheck {   
        require(msg.value >= COST, "Not Enough Ether");
        _;
    }

    function whitelistUpdate(address _newAddress, bool _status) public onlyOwner {
        whiteList[_newAddress] = _status;
        emit WhiteListUpdate(_newAddress, _status);
    }

    // 게임생성 함수
    function createGame(string memory _questionA, string memory _questionB, uint256 _deadline) public payable etherCheck onlyWhitelist {
        require(block.timestamp < _deadline, "invalid deadline");
        GAMEINDEX++;

        Game storage game = findGameById[GAMEINDEX];
        game.id = GAMEINDEX;
        game.questionA = _questionA;
        game.questionB = _questionB;
        game.voteCountA = 0;
        game.voteCountB = 0;
        game.totalETH = 0;
        game.createAt = block.timestamp;
        game.deadline = _deadline;
        game.creator = msg.sender;

        // 게임 추가 이벤트
        emit NewGame(GAMEINDEX, _questionA, _questionB, block.timestamp, _deadline, msg.sender); 
    }

    // 투표 함수
    function vote(uint256 _gameId, VoteOpttion _voteOption ) public payable etherCheck onlyWhitelist {
        Game storage game = findGameById[_gameId];
        require(game.creator != address(0) , "incorrect gameId");
        require(game.deadline > block.timestamp, "This game is finished game");
        require(!voteCheck[_gameId][msg.sender], "already voted");

        // 투표자 명단 추가
        voteCheck[_gameId][msg.sender] = true;
        game.votedList.push(msg.sender);

        // 투표 처리
        _voteOption == VoteOpttion.A ? game.voteCountA++ : game.voteCountB++; 

        // 투표 이벤트
        emit NewVote(_gameId, msg.sender, _voteOption, block.timestamp);
    }

    // // 당첨자 확인 함수
    // function checkWinner() {

    // }

    // // 당첨금 수령 함수
    // function claimEther() {

    // }
} 

