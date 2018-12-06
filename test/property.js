//jshint ignore: start

// contracts
const Property = artifacts.require("./Property.sol");
const PropertyRegistry = artifacts.require("./PropertyRegistry.sol");
//var BigNumber = require('bignumber.js');

/**************************************
* Tests
**************************************/

contract('Property Contract Tests', function(accounts) {

  let myNewToken;
  let originalBalance;
  let secondBalance;
  let property;
  let propertyRegistry;
  let amountToSend = 250;
  const owner = accounts[0]; 
  const alice = accounts[1];
  const third = accounts[2];
  const bob = accounts[3];
  const eve = accounts[4];

  it('should be deployed, Property', async () => {
    property = await Property.deployed();
    assert(property !== undefined, 'Property was NOT deployed' + property);
  });

  it('It should allow Alice to createProperty()', async () => {
      let response;
    try {
        response = await property.createProperty({from: alice});
        console.log(response.logs[0].args);
    } catch(e) {
      assert(false, 'Alice could not use createProperty()');
      return;
    }
    assert.equal(response.receipt.status, '0x01', 'Transaction successful');
    assert.equal(response.logs[0].event, 'Transfer', 'Event is a transfer');
  });

  let ownedTokenId;

  it('Alice should get a unique tokenId', async () => {
    ownedTokenId = await property.tokenOfOwnerByIndex(alice, 0, {from: alice});
    assert(ownedTokenId, 'Alice does not have a valid tokenId');
  });

  it('She should be able to setURI(herTokenId) to some string', async () => {
    try {
      await property.setURI(ownedTokenId, 'someString', {from: alice});
    } catch(e) {
      assert(false, 'Alice could not use setURI(). error: ' + e);
      return;
    }
    assert(true, 'Alice could use setURI()');
  });

  it('It should not allow someone other than Alice to setURI(herTokenId)', async () => {
    try {
      await property.setURI(ownedTokenId, 'someOtherString', {from: third});
    } catch(e) {
      assert(true, 'Someone other than Alice could not use setURI(). error: ' + e);
      return;
    }
    assert(false, 'Someone other than Alice could use setURI()');
  });

  it('should only allow the owner of a property to register that property', async () => {
    try {
      await propertyRegistry.registerProperty(ownedTokenId, 50, {from: alice});
    } catch(e) {
      assert(true, 'Someone other than Alice could not register that property. error: ' + e);
      return;
    }
    assert(false, 'Someone other than Alice could register that property');
  });

  it('should be deployed, PropertyRegistry', async () => {
    propertyRegistry = await PropertyRegistry.deployed();
    assert(propertyRegistry !== undefined, 'PropertyRegistry was NOT deployed' + propertyRegistry);
  });

  it('Bob can submit a request', async () => {
    try {
      await propertyRegistry.request(ownedTokenId, 1542603516, 1543121916, {from: bob});
    } catch(e) {
      assert(false, 'Bob could not submit a request. error: ' + e);
      return;
    }
    assert(true, '');
  });

  it('With the changes to handle multiple requests, Eve should be able submit another request after Bob did', async () => {
    try {
      await propertyRegistry.request(ownedTokenId, 1542603516, 1543121916, {from: eve});
    } catch(e) {
      assert(false, 'Eve could not submit another request. Error: ' + e);
      return;
    }
  });

  it('Bob can only check-in after Alice has approved and the approved time has come.', async () => {
    try {
      await propertyRegistry.checkIn(ownedTokenId, {from: bob});
    } catch(e) {
      assert(true, e);
      return;
    }
    assert(false, 'Bob was able to check in.');
  });

  it('After Alice has approved the request, Bob can check-in.', async () => {
    try {
      await propertyRegistry.approveRequest(ownedTokenId, bob, {from: alice});
      await propertyRegistry.checkIn(ownedTokenId, {from: bob});
    } catch(e) {
      assert(false, 'Bob was not able to check in after Alice approved the request.' + e);
      return;
    }
    assert(true, 'Bob was able to check in after Alice approved the request.');
  });

  it('A new request can be submitted by other guests.', async () => {
    try {
      await propertyRegistry.request(ownedTokenId, 1542603516, 1543121916, {from: eve});
    } catch(e) {
      assert(true, 'A new request could not be submitted' + e);
      return;
    }
    assert(true, 'Eve was able to submit another request.');
  });

  // Bob can submit a request
  // Eve should not be able to submit another request after Bob did
  // Alice can approve Bob's request (or not)
  // Eve cannot check-in into the property, even if the correct time has come.
  // Bob can only check-in after Alice has approved and the approved time has come.
  // Bob can check-out
  // A new request can be submitted by other guests
});