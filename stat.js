require('dotenv').config();
const { storeData, storeText, dynamicSort, uploadApk, jsonToCsv } = require("./tools.js")
const { getVehicle, getAssistant } = require("./vehicle_stat.js")

let ips = process.env.IPS.split(" ") //"123.123.123. 124.124.124. 125.125.125"
let vehicles = Array()

const v = async (ip) => {
    try {
        let a = await getVehicle(ip)
        if(a != null)
            vehicles.push(a)
    } catch(e) {}
}
const showAssistant = async (idAssistant) => {
    try {
        let a = await getAssistant(idAssistant, "")
        console.log(a)
    } catch(error) {
        console.error(error.message)
    }
}

const allVehicles = async (filename, csv_format) => {
    for(var y = 0; y < ips.length; y++) { 
        let p = Array();
        for(var i = 1; i < 256; i++) {
            p.push(v(`${ips[y]}${i}`))
        }
        let results = await Promise.all(p)
    }
    vehicles.sort(dynamicSort("board"))
    vehicles.sort(dynamicSort("route"))
    if(csv_format) {
        storeText(jsonToCsv(vehicles), filename.replace(/\.[^.]+$/, '.csv'))
    } else {
        storeData(vehicles, filename)
    }
}

const allVehiclesByStep = async (filename) => {
    var count = 0 
    var err = 0 
    for(var y = 0; y < ips.length; y++) { 
        for(var i = 1; i < 256; i++) {
            try {
                let ip = `${ips[y]}${i}`
                console.log('\033c', `url: http://${ip}:8080 / ${count} (${err})`)
                let obj = await getVehicle(ip)
                if(obj != null) {
                    vehicles.push(obj)
                    count++
                }
            } catch (error) {
                err++
            }
        }
    }
    storeData(vehicles, filename)
}

const restart = async (ip) => {
    let response = await fetch(`http://${ip}:8080/restart`, {method: 'POST'})
      let result = await response.json()
      console.log(result)
}

const termRestart = async (ip) => {
    let response = await fetch(`http://${ip}:8080/term/restart`, {method: 'POST'})
      let result = await response.json()
      console.log(result)
}


const installDA = async (filename, ip) => {

    uploadApk(
            //`http://${ip}:8080/install/app`,
            ip,
            filename,
            (percentComplete) => { console.log('\033c', `Upload progress: ${percentComplete.toFixed(2)}%`)},
            (response) => { console.log('Upload successful:', response) },
            (error) => { console.error('Upload failed:', error) }
        )
}

(async () => {
    const args = require('yargs').argv
    console.log(args)

    if(args.A) {
        await allVehicles(args.o || "vehicles.json", args.csv)
        // await allVehiclesByStep(args.o || "vehicles.json")
    } else if(args.R != undefined) {
        await restart(args.R)
    } else if(args.T != undefined) {
        await termRestart(args.T)        
    } else if(args.id > 0) {
        await showAssistant(args.id)
    } else if(args.I && args.file != undefined && args.ip != undefined) {
        await installDA(args.file, args.ip)
    } else {
        console.log("DA stat. Version: 1.0.0\n")
        console.log("Usage: node stat.js [options] <mainclass> [args...]\n")
        console.log(" where options include:\n")
        console.log(" -A                collect all DAs data on the IP address range [10.131.240.x, 10.131.246.x]")
        console.log(" --csv             converting output data to CSV format")
        console.log(" --o <filename>    save the result in a file named <filename>\n")
        console.log(" -R <ip>           restart DA by IP\n")
        console.log(" -T <ip>           restart TERMT005.031-031 R1 by IP\n")
        console.log(" --id <number>     display data on DA ID which is equal to <number>\n")    
        // console.log(" -I                install new version")
        // console.log(" --file <filename> download apk-file")
        // console.log(" --ip <ip>         IP DA\n")    
    }
    
  })();
