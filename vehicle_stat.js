const { createIMEI } = require("./tools.js")
var grpc = require('@grpc/grpc-js');
var protoLoader = require('@grpc/proto-loader');

var PROTO_PATH = __dirname + '/protos/driver_assistant_terminal.proto';
var packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {keepCase: true,
     longs: String,
     enums: String,
     defaults: true,
     oneofs: true
    });
var guidejet = grpc.loadPackageDefinition(packageDefinition).protocol.driver_assistant;
var client = new guidejet.ApiService('api.guidejet.kz:5000',
                                           grpc.credentials.createInsecure());


const getJSON = async (url) => {
    console.log(url)
    const response = await fetch(url);
    if (!response.ok) {
       throw new Error("network error");
    }
    return await response.json();
  }



const getAssistant = async (id, imei) => {
    var require = {
        id: id,
        uid: id == 0 ? imei : "",
        ip: ""
    }
    console.log(require)
    let promise = new Promise((resolve, reject) => {
        client.getAssistant( require , (err, assistant) => {
            if (err) {
                reject(err);
            } else {
                resolve(assistant);
            }
        });
    });
    let a = await promise;
    if(imei == a.uid && a.id > 0) {
        if(a.vehicle_id == 0) {
            return await getAssistant(a.id + 1, imei)
        } else {
            return a
        }
    } else if(imei == "") {
        return a
    }
}

const getVehicle = async (ip) => {
    let url = `http://${ip}:8080`
    try {
        var v = await getJSON(url);
        var obj = {
            board: v.board,
            route: v.route,
            appVersion: v.appVersion || v.app_version,
            url: url
        }
        var n = await getJSON(`${url}/network`)
        let imei = createIMEI(n["Mobile Equipment Identifier"])
        obj.imei = imei
        obj.nfc = n["Radio NFC"]
        obj.airmode = n["AirplaneMode"]
        obj.printer = n["Printer Status"]
        obj.dialer = n["Dialer"]
        try {
            var t = await getJSON(`${url}/terminal`)
            obj.terminal = t.masterState.msamId
        } catch (error) {
            obj.terminal = ""
        }

        try {
            let assistant = await getAssistant(0, imei)
            // obj.idAssistant = assistant.id
            // obj.idVehicle = assistant.vehicle_id
            obj.status = assistant.vehicle_status
            // obj.provider = assistant.provider_name
        } catch(error) {
            obj.status = "Unknown"
            // console.error("client.getAssistant", error);
        }
        return obj
  } catch (error) {
    // console.error("getVehicle", error);
    // throw new Error("don't open ip")
  }
}

// (async () => {
//     const arg = process.argv.slice(2)
//     console.log(arg)
//     let v = await getVehicle(arg[0])
//     console.log(arg[0], v)
// })();

module.exports = { getVehicle, getJSON, getAssistant };