const { createIMEI } = require("./tools.js")
const { parse } = require("himalaya")
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


async function readFromStream(stream) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            result += decoder.decode(value, { stream: true });
        }
    } catch (error) {
        console.error('Ошибка при чтении потока:', error);
    } finally {
        reader.releaseLock();
    }

    return result;
}

const getJSON = async (url) => {
    console.log(url)
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("network error");
    }
    const body = await readFromStream(response.body);
    try {
        return await JSON.parse(body);
    } catch(err) {
        if(err.toString().startsWith('SyntaxError: Unexpected token')) {
            var e = new Error("Format")
            e.name = "Format"
            e.message = body
            throw e
        }
        // throw err
    }
    // console.log(await response.text())
  }


const setUpdateVersion = async (version, imei) => {
    const url = "http://vmt-term-srv.tha.kz/store/version"
    const response = await fetch(url, {
        method: "PUT", // *GET, POST, PUT, DELETE, etc.
        // mode: "cors", // no-cors, *cors, same-origin
        cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        // credentials: "same-origin", // include, *same-origin, omit
        headers: {
          "Sec-CH-UA-Full-Version": version,
          "Sec-CH-UA-Model": "da4",
          "Sec-CH-UA-UID": imei
        }
      });
    if (!response.ok) {
        throw new Error("network error");
    }
    const body = await readFromStream(response.body);
    console.log(imei, body)
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
    // if(imei == a.uid && a.id > 0) {
    //     if(a.vehicle_id == 0) {
    //         return await getAssistant(a.id + 1, imei)
    //     } else {
    //         return a
    //     }
    // } else if(imei == "") {
        return a
    // }
}

const getVehicle = async (ip) => {
    let url = `http://${ip}:8080`
    var obj = {}
    try {
        var v = await getJSON(url);
        obj.board = v.board
        obj.route = v.route
        obj.appVersion = v.appVersion || v.app_version
        obj.url = url
    } catch(error) {
        if(error.message === 'fetch failed') {
            // console.log('fetch failed', error.cause.code)
            return
        }
        // console.log(error.toString())
        // console.log(await error.message)
        // console.log(url)
        // return
        // const response = await fetch(url);
        // if (!response.ok) {
        //    throw new Error("network error");
        // }
        // var r = await response.text();
        const json = parse(error.message)
        const body = json[2].children[3].children[1]
        obj.board = body.children[3].children[3].children[0].content
        obj.route = body.children[5].children[3].children[0].content
        obj.appVersion = body.children[1].children[3].children[0].content
        obj.url = url
    }
    try {
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
        // console.log(obj)
        return obj
  } catch (error) {
    console.error("getVehicle", error);
    // throw new Error("don't open ip")
  }
}


// (async () => {
//     const arg = process.argv.slice(2)
//     console.log(arg)
//     let v = await getVehicle(arg[0])
//     console.log(arg[0], v)
// })();

module.exports = { getVehicle, getJSON, getAssistant, setUpdateVersion };