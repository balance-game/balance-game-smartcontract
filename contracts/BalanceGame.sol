// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

contract BalanceGame is VRFConsumerBaseV2Plus {
    uint256 immutable public COST; // 게임 이용 s비용 
    uint256 public gameIndex = 0; // 게임ID 카운트

    // VRF
    uint256 s_subscriptionId;
    address vrfCoordinator = 0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B;
    bytes32 s_keyHash = 0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae;
    uint32 callbackGasLimit = 250000;
    uint16 requestConfirmations = 3;
    uint32 numWords = 3;

    constructor(uint256 _cost, uint256 _subscriptionId) VRFConsumerBaseV2Plus(vrfCoordinator) {
        COST = _cost;
        whiteList[msg.sender] = true;

        s_subscriptionId = _subscriptionId;
    }

    enum VoteOption { A, B }

    struct Winner {
        address[3] ranks;
        bool[3] claimed;
    }

    struct Creator {
        address creator;
        bool claimed;
    }

    struct Game {
        uint256 id;
        string questionA;
        string questionB;
        uint256 voteCountA;
        uint256 voteCountB;
        address[] votedList;
        uint256 totalpool;
        uint256 createAt;
        uint256 deadline;
        Creator creator;
        Winner winners;
    }

    mapping (uint256 => Game) private findGameById; // 게임 정보 조회
    mapping (uint256 => mapping(address => bool)) voteCheck; // 투표 유무 체크
    mapping (address => bool) public isContinue; // 연속 당첨 판별
    mapping (address => bool) public whiteList; // 화이트리스트
    mapping(uint256 => uint256) public requestIdToGameId;

    event NewGame(uint256 indexed gameId, string questionA, string questionB, uint256 createdAt, uint256 deadline, address indexed creator);
    event NewVote(uint256 indexed gameId, address indexed votedAddress, VoteOption VoteOption, uint256 votedAt);
    event NewWinner(uint256 indexed gameId, address[3]);
    event ClaimPool(uint256 indexed gameId, address claimAddress, uint256 amount);
    event WhiteListUpdate(address indexed userAddress, bool status);

    modifier onlyWhitelist {
        require(whiteList[msg.sender], "only use Whitelist");
        _;
    }

    modifier feeCheck {   
        require(msg.value >= COST, "Not Enough fee");
        _;
    }

    // 게임 이벤트 조회
    function getGameInfo(uint256 _gameId) public view returns (
        uint256 id,
        string memory questionA,
        string memory questionB,
        uint256 voteCountA,
        uint256 voteCountB,
        uint256 totalpool,
        uint256 createAt,
        uint256 deadline,
        address creator,
        bool creatorClaimed
    ) {
        Game storage game = findGameById[_gameId];

        return (
            game.id,
            game.questionA,
            game.questionB,
            game.voteCountA,
            game.voteCountB,
            game.totalpool,
            game.createAt,
            game.deadline,
            game.creator.creator,
            game.creator.claimed
        );
    }

    // 당첨자 조회
    function getGameWinner(uint256 _gameId) public view returns (
        address[3] memory winners, 
        bool[3] memory winnersClaimed
    ) {
        Game storage game = findGameById[_gameId];
        require(game.creator.creator != address(0) , "incorrect gameId");
        
        return (
            game.winners.ranks,
            game.winners.claimed
        );
    }

    // 화이트 리스트 업데이트
    function whitelistUpdate(address _newAddress, bool _status) public onlyOwner {
        whiteList[_newAddress] = _status;
        emit WhiteListUpdate(_newAddress, _status);
    }

    // 게임생성 함수
    function createGame(string memory _questionA, string memory _questionB, uint256 _deadline) public payable feeCheck onlyWhitelist {
        require(block.timestamp < _deadline, "invalid deadline");
        gameIndex++;

        Game storage game = findGameById[gameIndex];
        game.id = gameIndex;
        game.questionA = _questionA;
        game.questionB = _questionB;
        game.voteCountA = 0;
        game.voteCountB = 0;
        game.totalpool = 0;
        game.createAt = block.timestamp;
        game.deadline = _deadline;
        game.creator.creator = msg.sender;

        // 게임 추가 이벤트
        emit NewGame(gameIndex, _questionA, _questionB, block.timestamp, _deadline, msg.sender); 
    }

    // 투표 함수
    function vote(uint256 _gameId, VoteOption _voteOption ) public payable feeCheck onlyWhitelist {
        Game storage game = findGameById[_gameId];
        require(game.creator.creator != address(0) , "incorrect gameId");
        require(game.deadline > block.timestamp, "This game is finished game");
        require(!voteCheck[_gameId][msg.sender], "already voted");

        // 투표자 명단 추가
        voteCheck[_gameId][msg.sender] = true;
        game.votedList.push(msg.sender);

        // 투표 처리
        _voteOption == VoteOption.A ? game.voteCountA++ : game.voteCountB++; 

        // 참가비 누적
        game.totalpool += msg.value;

        // 투표 이벤트
        emit NewVote(_gameId, msg.sender, _voteOption, block.timestamp);
    }

    // 당첨자 추첨 함수
    function checkWinner(uint256 _gameId) public onlyWhitelist onlyOwner {
        Game storage game = findGameById[_gameId];
        require(game.creator.creator != address(0) , "incorrect gameId");
        require(game.deadline < block.timestamp, "This game is not finish");
        require(game.votedList.length >= 3, "Not enough voters");
        require(game.winners.ranks[0] == address(0), "Already drawn.");

        uint256 requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: s_keyHash,
                subId: s_subscriptionId,
                requestConfirmations: requestConfirmations,
                callbackGasLimit: callbackGasLimit,
                numWords: numWords,
                extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: false}))
            })
        );

        requestIdToGameId[requestId] = _gameId;
    }

    // VRF 빈환함수 (게임 우승자 처리)
    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        uint256 gameId = requestIdToGameId[requestId];
        require(gameId != 0, "Invalid requestId");

        Game storage game = findGameById[gameId];

        for (uint8 i; i < 3; i++) {
            uint256 winnerIndex = randomWords[i] % game.votedList.length;
            address winner = game.votedList[winnerIndex];
            game.winners.ranks[i] = winner; 
        }

        emit NewWinner(
            gameId,
            game.winners.ranks
        );
    }

    // 당첨금 수령 함수
    function claimPool(uint256 _gameId) public payable {
        Game storage game = findGameById[_gameId];
        require(game.creator.creator != address(0) , "incorrect gameId");
        require(game.deadline < block.timestamp, "This game is not finish");
        require(game.winners.ranks[0] != address(0), "draw not yet");
        require(
            game.winners.ranks[0] == msg.sender ||
            game.winners.ranks[1] == msg.sender ||
            game.winners.ranks[2] == msg.sender ||
            game.creator.creator == msg.sender, "Only a winner or the game creator may call this function."
        );

        bool success;
        uint256 reward = 0;

        // 게임 생성자 보상
        // 만약 게임 생성자와 당첨자가 동일하면 중복수령 가능
        if (game.creator.creator == msg.sender) {
            require(!game.creator.claimed, "already claimed");
            reward = (game.totalpool * 5) / 100;
            (success, ) = msg.sender.call{value: reward}("");
            require(success, "claimPool fail");
            game.creator.claimed = true;

            emit ClaimPool(game.id, msg.sender, reward);
        }

        // 게임 참가자 보상
        uint8 rank;
        if (game.winners.ranks[0] == msg.sender) {
            require(!game.winners.claimed[0], "already claimed");
            rank = 0;

            // 1등 45%
            reward += (game.totalpool * 45) / 100;
        }
        else if (game.winners.ranks[1] == msg.sender) {
            require(!game.winners.claimed[1], "already claimed");
            rank = 1;

            // 2등 25%
            reward += (game.totalpool * 25) / 100;
        } 
        else if (game.winners.ranks[2] == msg.sender) {
            require(!game.winners.claimed[2], "already claimed");
            rank = 2;

            // 3등 20%
            reward += (game.totalpool * 20) / 100;
        } 
        else {
            return;
        }

        // 보너스 이더
        if (isContinue[msg.sender]) {
            reward += (game.totalpool * 5) / 100;

            isContinue[msg.sender] = false;
        }

        // 이더 전송
        (success, ) = msg.sender.call{value: reward}("");
        require(success, "transation fail");
        
        emit ClaimPool(game.id, msg.sender, reward);
        game.winners.claimed[rank] = true;
    }

    receive() external payable { }
    fallback() external payable {
        revert("function not found");    
    }
}