let web3Provider;
let useSessionStorage = false;
var contracts = {
    "property" : null,
    "propertyRegistry" : null,
    "propertyToken" : null
};
let showEventLogging = true;

if (typeof web3 !== 'undefined') {
    // Check if a web3 instance has been injected, 
    //e.g. if I'm using Metamask and it injects web3.js for me
    web3Provider = web3.currentProvider;
}
else {
    // otherwise connect to truffle ourselves
    web3Provider = new Web3.providers.HttpProvider('http://127.0.0.1:7545/');
}
window.web3 = new Web3(web3Provider);

async function PropertyInit() {

    if (useSessionStorage && sessionStorage.getItem("propertyContract")) {
        var storedContractData = JSON.parse(sessionStorage.getItem("propertyContract"));
        var newPropertyContract = web3.eth.contract(storedContractData.abi);
        contracts.property = await newPropertyContract.at(storedContractData.address);
        console.log("Contract found in session storage: Property");
        return;
    }

    // Uses Fetch API to request contract artifact; fetch() returns a promise
    // Upon resolution, .json() takes the response stream and returns another promise.
    // This 2nd promise resolves as the contract artifact body text, parsed as a JSON
    const json = await fetch('../../build/contracts/Property.json').then(function(res) {
        return res.json();
        console.log(res);
    }).catch(function(err){
        console.error(err);
    });
    
    contracts.property = await getContract(json);
    sessionStorage.setItem("propertyContract", JSON.stringify(contracts.property));
    console.log("Contract created: Property");


    const event = contracts.property.allEvents({ fromBlock: 0, toBlock: 'latest' });
    event.watch((err, res) => {
        if (showEventLogging) {
            if (err) {
                console.error('watch error', err);
            } else {
                console.groupCollapsed('Event logged for Property Contract');
                console.log('blockNumber: ' + res.blockNumber);
                console.log('event: ' + res.event);
                console.groupEnd();
            }
        }
    });
}

async function PropertyRegistryInit() {
    if (useSessionStorage && sessionStorage.getItem("propertyRegistryContract")) {
        var storedContractData = JSON.parse(sessionStorage.getItem("propertyRegistryContract"));
        var newPropertyRegistryContract = web3.eth.contract(storedContractData.abi);
        contracts.propertyRegistry = await newPropertyRegistryContract.at(storedContractData.address);
        console.log("Contract found in session storage: Property");
        return;
    }
    // Uses Fetch API to request contract artifact; fetch() returns a promise
    // Upon resolution, .json() takes the response stream and returns another promise.
    // This 2nd promise resolves as the contract artifact body text, parsed as a JSON
    const json = await fetch('../../build/contracts/PropertyRegistry.json').then(function(res) {
        return res.json();
        console.log(res);
    }).catch(function(err){
        console.error(err);
    });
    
    contracts.propertyRegistry = await getContract(json);
    sessionStorage.setItem("propertyRegistryContract", JSON.stringify(contracts.propertyRegistry));
    console.log("Contract created: Property Registry");
    
    const event = contracts.propertyRegistry.allEvents({fromBlock: 0, toBlock: 'latest'});
    event.watch((err, res) => {
        if (showEventLogging) {
            if (err) {
                console.error('watch error', err);
            } else {
                console.groupCollapsed('Event logged for Property Registry Contract');
                console.log('blockNumber: ' + res.blockNumber);
                console.log('event: ' + res.event);
                console.groupEnd();
            }
        }
    });
}

// getContract takes a contract artifact JSON and a web3 instance,
// sets the web3 provider address,
// and returns the deployed instance of the contract
async function getContract(json, web3 = window.web3) {
    const contract = TruffleContract(json);
    contract.setProvider(web3.currentProvider);
    return contract.deployed();
}

async function createPropertyHandler(name) {
    let resp;
    try {
        resp = await contracts.property.createProperty({
            from: getSelectedUserAccount(),
            gas: 250000
        }).then(function(){
            accessRegistryHandler();
        });
        console.group("createPropertyHandler");
            console.log(resp);
            console.log('Property Created for ' + name);
            console.log("Receipt status: " + resp.receipt.status, 'Transaction successful')
            console.log("Event type: " + resp.logs[0].event);
            console.log("Token ID: " + resp.logs[0].args._tokenId);
        console.groupEnd();
        var data = {
            "tokenId": resp.logs[0].args._tokenId,
            "owner": name,
        };
        renderPropertyRow("createdProperty", data);
        $("[data-type='createdProperties']").show();

    } catch(e) {
        console.error("createPropertyHandler: Error: " + e);
    }
}

async function namePropertyHandler(_propertyName, tokenId) {
    if (!tokenId) {
        alert("No property has been selected to name.");
        return;
    }
    try {
        const resp = await contracts.property.setURI(
            tokenId, 
            _propertyName, 
            {from: getSelectedUserAccount()}
        );
        console.group("namePropertyHandler");
        console.log(resp);
        console.groupEnd();
        const newName = await contracts.property.getURI(
            tokenId, 
            {from: getSelectedUserAccount()}
        );
        console.log("Property tokenId " + tokenId + " URI set to " + newName + ".");
        var target = $("label[data-tokenid='" + tokenId + "']");
        setSectionName("createdProperty", getSelectedUser());
        if (target.find(".uri").length > 0) {
            target.find(".uri").html("<b>URI</b> " + newName)
        } else {
            target.append('<p class="details uri"><b>URI</b> ' + newName + '</p>');
        }
    } catch(e) {
        console.error("namePropertyHandler: Error: " + e);
        alert("namePropertyHandler: Error: " + e);
    }
}


async function tokenizePropertyHandler(_propertyName) {
    var tokenId = getTokenId();
    if (!tokenId) {
        alert("No property selected to tokenize.");
        return;
    }
    var price = $("#propertyPrice").val();
    if (!price) {
        alert("No price set.");
        return;
    }
    try {
        const resp = await contracts.propertyRegistry.registerProperty(
            tokenId, 
            price, 
            {from: getSelectedUserAccount()}
        );
        accessRegistryHandler();
        alert("Tokenize property [tokenId: " + tokenId + "]. Retrieving updated registry for " + getSelectedUser());
        console.group("tokenizePropertyHandler");
            console.log(resp);
        console.groupEnd();
    } catch(e) {
        console.error("tokenizePropertyHandler: Error: " + e);
    }
}

async function accessRegistryHandler() {
    try {
        const resp = await contracts.property.getProperties(
            {from: getSelectedUserAccount()}
        );
        console.group("accessRegistryHandler");
        console.log("Access Registry of: " + getSelectedUser());
        console.log(resp);
        console.groupEnd();
        clearRegistryContent();
        setSectionName("properties", getSelectedUser());
        if (resp.length > 0) {
            $("[data-type='registry'] .empty").hide();
            $(resp).each(function(){
                populateRegistryResult(this);
            })
        } else {
            $("[data-type='registry'] .empty").show();
        }
    } catch(e) {
        console.error("accessRegistryHandler: Error: " + e);
    }
}

function requestReservationHandler() {
    var tokenId = getTokenId();
    if (!tokenId) {
        alert("No property selected to request a stay.");
        return;
    }
    var from = $("#dateFrom").datepicker("getDate");
    var to = $("#dateTo").datepicker("getDate");
    if (!from || !to) {
        alert("Either the start or end date is empty");
        return;
    }
    try {
        var unixFrom = Math.round((from).getTime() / 1000);
        var unixTo = Math.round((to).getTime() / 1000);
        propertyRegistry_request(parseInt(tokenId), unixFrom, unixTo);
        
    } catch(e) {
        console.error("Error: " + e);
    }
};

async function property_getURI(tokenId) {
    try {
        var data = await contracts.property.getURI(
            tokenId, 
            {from: getSelectedUserAccount()}
            )
        return data; 
    } catch(e) {
        console.error("property_getURI: Error: " + e  + ". tokenId: " + tokenId);
    }
}

async function propertyRegistry_request(tokenId, fromDate, toDate) {
    try {
        await contracts.propertyRegistry.request(
            tokenId, 
            fromDate, 
            toDate, 
            {from: getSelectedUserAccount()}
        );

        var data = {
            "tokenId": tokenId,
            "from": fromDate,
            "to": toDate
        }
        renderRequestRow(data);
    } catch(e) {
        console.error("propertyRegistry_request: Error: " + e  + ". tokenId: " + tokenId);
    }
}

async function propertyRegistry_getRequests(tokenId, from) {
    try {
        var data = await contracts.propertyRegistry.getRequests(
            tokenId, 
            from
        );
        console.log("propertyRegistry_getRequests");
        console.log(data);
    } catch(e) {
        console.error("propertyRegistry_request: Error: " + e  + ". tokenId: " + tokenId);
    }
}

async function propertyRegistry_getStayData(tokenId) {
    try {
        var data = await contracts.propertyRegistry.getStayData(
            tokenId, 
            {from: getSelectedUserAccount()}
        )
        return data;
    } catch(e) {
        console.error("propertyRegistry_getStayData: Error: " + e  + ". tokenId: " + tokenId);
    }
}

async function populateRegistryResult(tokenId) {
    var stayData = await propertyRegistry_getStayData(tokenId);
    var URI = await property_getURI(tokenId);
    var data = {
        "price": stayData[0],
        "stays": stayData[1],
        "occupant": stayData[2],
        "uri": URI,
        "tokenId": tokenId
    };
    renderPropertyRow("properties", data);
}

async function propertyRegistry_approveRequest(tokenId, address, target) {
    try {
        var data = await contracts.propertyRegistry.approveRequest(
            tokenId, 
            address,
            {from: getSelectedUserAccount()}
        );
        console.log("approve: " + data);
        if (data.logs[0].event == "Approved") {
            $(target).removeClass("approveButton").addClass("checkInButton").html("Check In");
        }
        return data; 
    } catch(e) {
        console.error("propertyRegistry_approveRequest: Error: " + e  + ". tokenId: " + tokenId);
    }
}

async function propertyRegistry_checkIn(tokenId, target) {
    try {
        var data = await contracts.propertyRegistry.checkIn(
            tokenId, 
            {from: getSelectedUserAccount()}
        );
        console.log("approve: " + data);
        // if (data.logs[0].event == "Approved") {
        //     $(target).removeClass("approveButton").addClass("checkInButton").html("Check In");
        // }
        return data; 
    } catch(e) {
        console.error("propertyRegistry_checkIn: Error: " + e  + ". tokenId: " + tokenId);
    }
}

function setSectionName(panelName, name) {
    $("[data-type='" + panelName + "']").data("name", name).attr("data-name", name);
}

function clearRegistryContent(name) {
    $("[data-type='properties'] .selection").empty();
}

function renderRequestRow(data) {
    // var ownerAddress = getPropertyOwner(data.tokenId);
    // console.log("owner address: " + ownerAddress);
    var target = $("[data-type='requests'] .selection");
    var div = $('<div class="approve" data-tokenid="' + data.tokenId + '"></div>');
    var p = $('<p class="details title"><b>Property Token Id</b> ' + data.tokenId + '</p>');
    var p1 = $('<p class="details requester"><b>Requester</b> ' + getSelectedUser() + '</p>');
    p.appendTo(div);
    p1.appendTo(div);
        
    if (data.from) {
        var fromDate = convertUNIXTimestampToTime(data.from);
        var p2 = $('<p class="details uri"><b>From</b> ' + fromDate + '</p>');
        p2.appendTo(div);
    }
    if (data.to) {
        var fromTo = convertUNIXTimestampToTime(data.to);
        var p3 = $('<p class="details price"><b>To</b> ' + fromTo + '</p>');
        p3.appendTo(div);
    }
    var approveButton = $('<button class="approveButton" data-tokenid="' + data.tokenId + '" data-for="' + getSelectedUserAccount() + '">Approve Request</button>');
    approveButton.appendTo(div);
    div.appendTo(target);
}

function renderPropertyRow(panelName, data) {
    if (data.price && data.price > 0) {
        var target = $("[data-type='" + panelName + "'] .registered .selection");
    } else {
        var target = $("[data-type='" + panelName + "'] .unregistered .selection");
    }
    var className = "";
    var label = $('<label for="' + className + data.tokenId + '" class="' + className + '" data-tokenid="' + data.tokenId + '"><b> Token Id</b>: ' + data.tokenId + '</label>');
    var input = $('<input type="radio" name="property" value="' + data.tokenId + '" id="' + className + data.tokenId + '" />');
    input.appendTo(label);
    if (data.owner) {
        var p1 = $('<p class="details owner"><b>Owner</b> ' + data.owner + '</p>');
        p1.appendTo(label);
    }
    if (data.uri) {
        var p2 = $('<p class="details uri"><b>URI</b> ' + data.uri + '</p>');
        p2.appendTo(label);
    }
    if (data.price) {
        var p3 = $('<p class="details price"><b>Price</b> ' + data.price + '</p>');
        p3.appendTo(label);
    }
    if (data.stays) {
        var p4 = $('<p class="details stays"><b>Stays</b> ' + data.stays + '</p>');
        p4.appendTo(label);
    }
    label.appendTo(target);
}

var users = {
    "alice" : null,
    "bob" : null,
    "carl" : null
};

function getTokenId() {
    return $("input[name=property]:checked").val();
}

function getSelectedUser() {
    return $("input[name=user]:checked").val();
}

function getSelectedUserAccount() {
    return users[getSelectedUser()];
}

function convertUNIXTimestampToTime(input) {
    var time = new Date(input * 1000);
    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return months[time.getUTCMonth()] + " " + time.getUTCDate() + ", " + time.getUTCFullYear();
}

window.onload = function() {

    PropertyInit();
    PropertyRegistryInit();
    
    users.alice = web3.eth.accounts[0];
    users.bob = web3.eth.accounts[1];
    users.carl = web3.eth.accounts[2];

    $('#dateFrom').datepicker({
        format: "dd/mm/yyyy",
        autoclose: true
    });
    $('#dateTo').datepicker({
        format: "dd/mm/yyyy",
        autoclose: true
    });

    //$("#dateFromInput").

    document.querySelector('#createProperty').onclick = function(){
        var _name = getSelectedUser();
        createPropertyHandler(_name);
    };
    
    document.querySelector('#nameProperty').onclick = function(){
        var _propertyName = $("#propertyName").val();
        namePropertyHandler(_propertyName, getTokenId());
    };

    document.querySelector('#tokenizeProperty').onclick = function(){
        tokenizePropertyHandler();
    };

    document.querySelector('#accessRegistry').onclick = function(){
        accessRegistryHandler();
    };

    document.querySelector('#requestReservation').onclick = function(){
        requestReservationHandler();
    };

    $(document).on("click", ".approveButton", function(){
        var data = $(this).data();
        propertyRegistry_approveRequest(data.tokenid, data.for, this);
    });

    $(document).on("click", ".checkInButton", function(){
        var data = $(this).data();
        propertyRegistry_checkIn(data.tokenid, this);
    })
};