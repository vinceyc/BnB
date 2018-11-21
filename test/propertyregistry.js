// contracts
const Property = artifacts.require("./Property.sol");
const PropertyRegistry = artifacts.require("./PropertyRegistry.sol");
const PropertyToken = artifacts.require("./PropertyToken.sol");

/**************************************
* Tests
**************************************/

contract('Property Token Contract Tests', function(accounts) {

  const alice = accounts[0]
  const bob = accounts[1];

  const allocation = 10000;
  it('should be deployed, Property', async () => {
    property = await Property.deployed();
    assert(property !== undefined, 'Property was NOT deployed' + property);
  });

  it('should be deployed, Property Registry', async () => {
    propertyRegistry = await PropertyRegistry.deployed();
    assert(propertyRegistry !== undefined, 'propertyRegistry was NOT deployed' + propertyRegistry);
  });

  it('should be deployed, Property Token', async () => {
    propertyToken = await PropertyToken.deployed();
    assert(propertyToken !== undefined, 'PropertyToken was NOT deployed' + propertyToken);
  });

  it('should allow alice to mint Property Token for bob', async () => {
    const tx = await propertyToken.mint(bob, allocation);
    //get the balance of property tokens for bob
    const balance = await propertyToken.balanceOf.call(bob);
    assert.equal(balance.toNumber(), allocation, 'balance');
  });

  const price = 1000;
  it('should allow bob to approve the property registry to use his tokens', async () => {
    try {
      const tx = await propertyToken.approve(propertyRegistry.address, price, { from: bob });
    } catch (e) {
      assert.equal(tx, undefined, 'property registry has not been approved. error: ' + e);
      return;
    }
  });

  it('It should allow Alice to createProperty()', async () => {
    let tx;
    try {
        tx = await property.createProperty({from: alice});
    } catch(e) {
      assert(false, 'Alice could not use createProperty()');
      return;
    }
  });

  let ownedTokenId; 

  it('Alice should get a unique tokenId', async () => {
    ownedTokenId = await property.tokenOfOwnerByIndex(alice, 0, {from: alice});
    assert(ownedTokenId, 'Alice does not have a valid tokenId');
  });

  let propertyPrice = 50;

  it('Alice should be able to register that property', async () => {
    try {
      await propertyRegistry.registerProperty(ownedTokenId, propertyPrice, {from: alice});
    } catch(e) {
      assert(false, 'Alice could not register that property. error: ' + e);
      return;
    }
  });

  it('Bob can submit a request', async () => {
    try {
      await propertyRegistry.request(ownedTokenId, 1542603516, 1543121916, {from: bob});
    } catch(e) {
      assert(false, 'Bob could not submit a request. error: ' + e);
      return;
    }
  });

  it('Alice should be able to approve the request.', async () => {
    try {
      await propertyRegistry.approveRequest(ownedTokenId, bob, {from: alice});
    } catch(e) {
      console.log(e);
      assert(false, 'Alice could not approve the request.' + e);
      return;
    }
  });

  let preCheckInBalance; 
  it('After Alice has approved the request, Bob can check-in.', async () => {
    try {
      preCheckInBalance = await propertyToken.balanceOf.call(alice);
      await propertyRegistry.checkIn(ownedTokenId, {from: bob});
    } catch(e) {
      console.log(e);
      assert(false, 'Bob was not able to check in.' + e);
      return;
    }
  });

  it('Bob can check-out.', async () => {
    try {
      await propertyRegistry.checkOut(ownedTokenId, {from: bob});
    } catch(e) {
      console.log(e);
      assert(false, 'Bob was not able to check out.' + e);
      return;
    }
  });
  
  it('Verify Alice has been paid.', async () => {
    let postcheckInBalance = await propertyToken.balanceOf.call(alice);
    propertyPrice
    assert.equal(postcheckInBalance.toNumber(), preCheckInBalance.toNumber() + propertyPrice, "Alice has been paid the property price");
  });

});