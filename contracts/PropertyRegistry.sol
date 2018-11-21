pragma solidity ^0.4.24;

import 'zeppelin-solidity/contracts/token/ERC721/ERC721Basic.sol';
import 'zeppelin-solidity/contracts/token/ERC20/ERC20.sol';

contract PropertyRegistry {
    mapping(uint256 => Data) public stayData;

    struct Request {
        uint256 checkIn;
        uint256 checkOut;
        bool approved;
    }

    struct Data {
        uint256 price;
        uint256 stays;
        address occupant;
        mapping(address => Request) requests;
    }

    // initialize the property registry variable
    ERC721Basic property;
    ERC20 propertyToken;
    //set up the property contract as minimum interface 
    //to prove ownership ERC721Basic
    constructor(address _property, address _propertyToken) public {
        property = ERC721Basic(_property);
        propertyToken = ERC20(_propertyToken);
    }

    modifier onlyOwner(uint256 _tokenId) {
        require(property.ownerOf(_tokenId) == msg.sender);
        _;
    }

    function registerProperty(uint256 _tokenId, uint256 _price) external onlyOwner(_tokenId) {
        stayData[_tokenId] = Data(_price, 0, address(0));
    }

    function request(uint256 _tokenId, uint256 _checkIn, uint256 _checkOut) external {
        stayData[_tokenId].requests[msg.sender] = Request(_checkIn, _checkOut, false);
    }

    function approveRequest(uint256 _tokenId, address _for) external onlyOwner(_tokenId) {
        stayData[_tokenId].requests[_for].approved = true;
    }

    function checkIn(uint256 _tokenId) external {
        Request storage req = stayData[_tokenId].requests[msg.sender];
        require(req.approved == true);
        require(now > req.checkIn && now < req.checkOut);
        require(stayData[_tokenId].occupant == address(0));
        require(propertyToken.transferFrom(msg.sender, address(this), stayData[_tokenId].price));
        stayData[_tokenId].occupant = msg.sender;
    }

    function checkOut(uint256 _tokenId) external {
        Request storage req = stayData[_tokenId].requests[msg.sender];
        require(stayData[_tokenId].occupant == msg.sender);
        require(now < req.checkOut);
        require(propertyToken.transfer(property.ownerOf(_tokenId), stayData[_tokenId].price));
        stayData[_tokenId].occupant = address(0);
        stayData[_tokenId].stays++;
    }

    function getRequests(uint256 _tokenId, address _from) public view returns(uint256 _checkIn, uint256 _checkOut, bool _approved) {
        Request storage req = stayData[_tokenId].requests[_from];
        return (req.checkIn, req.checkOut, req.approved);
    }
}