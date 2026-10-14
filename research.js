const { getVehicle, getAssistant } = require("./vehicle_stat.js")
const { loadData, addUniqueToMap, storeData, storeText, dynamicSort, uploadApk, jsonToCsv } = require("./tools.js")
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
var client = new guidejet.ApiService('api.guidejet.kz:5000', grpc.credentials.createInsecure());

const getProviders = async () => {
    var require = {}
    // console.log(require)
    let promise = new Promise((resolve, reject) => {
        client.getProviders( require , (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
    return await promise;
}

/**
 * 
 * @param {*} idProvider 
 * @returns {items: [{ id: 10125, name: '12' },{ id: 41, name: '32' },{ id: 87, name: '45' }]}
 */
const getRoutes = async (idProvider) => {
    var require = {
        id: idProvider
    }
    let promise = new Promise((resolve, reject) => {
        client.getRoutes( require , (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
    return await promise;
}

/**
 * 
 * @param {*} idProvider 
 * @returns {items: [{ id: 18100, name: '(2450)144EU02' },{ id: 18101, name: '(2451)998ET02' }]}
 * id_vehicle != id_da
 *  id: 18100,
    vehicle_id: 0,
    provider_id: 0,
    group_id: 0,
    route_id: 0,
    scheme_id: 0,
 */
const getVehicles = async (idProvider) => {
    var require = {
        id: idProvider
    }
    let promise = new Promise((resolve, reject) => {
        client.getVehicles( require , (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
    return await promise;
}

const getRouteScheme = async (idRoute) => {
    var require = {
        id: idRoute
    }
    let promise = new Promise((resolve, reject) => {
        client.getRouteScheme( require , (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
    return await promise;
}

const showAssistant = async (idAssistant) => {
    var require = {
        id: idAssistant
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
    return await promise;
}

(async () => {
    let mapRoutes = new Map()
    let arr = loadData('ids_da.txt')
    const das = JSON.parse(arr)
    let da = das[45]
    for (const da of das) {
        await showAssistant(da).then((res) => {
            if(res.scheme_id != 0 && res.route_id != 0) {
                addUniqueToMap(mapRoutes, res.route_id, res.scheme_id)
            }
            
        }).catch((err) => {
            console.error(err)
        })
    }
    console.log(mapRoutes)
    const providers = (await getProviders()).items
    for (const provider of providers) {
        console.log(provider.id, ":", provider.name)
        await getRoutes(provider.id).then(async (routes) => {
            for (const route of routes.items) {
                const schemes = mapRoutes.get(route.id)
                if (schemes == undefined) {
                    console.log("  route_id:", route.id, ", №:", route.name, ": scheme_id -")
                    continue
                }
                for (const scheme_id of schemes) {
                    await getRouteScheme(scheme_id).then((scheme) => {
                        const counts = scheme.directions
                            .filter(item => Array.isArray(item.points))
                            .map(item => item.points.length);
                        const result = `direction: ${counts.length} [${counts.join(', ')}]`;
                        console.log("  route_id:", route.id, ", №:", route.name, ": scheme_id:", scheme_id, result)
                    }).catch((err) => {
                        console.log("  route_id:", route.id, ", №:", route.name, ": scheme_id:", scheme_id, ": direction -")
                    })
                }
            }
        }).catch((err) => {
            console.error(err)
        })
    }
    // await getVehicles(10042).then(async (res) => {
    //     console.log(res)
    // }).catch((err) => {
    //     console.log(err)
    // })
    // await getRouteScheme(84).then((scheme) => {
    //     console.log(scheme)


    // }).catch((err) => {
    //     console.log(err)
    // })

  })();