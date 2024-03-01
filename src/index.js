import WebSocket from "ws";

import _ from "lodash";
import events from "events";
import mqtt from "mqtt";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { Buffer } from "buffer";

import WardenclyffeRPCDispatch from "./rpc";
import WardenclyffeEventingDispatch from "./eventing";
import Watchdog from "./watchdog";

const debug = require("debug")("wardenclyffe");

const symbolEventsBound = Symbol();

global.WebSocket = WebSocket;



class Wardenclyffe extends events.EventEmitter {

    #clientId;
    #client;
    #mqtt_url; #mqtt_username; #mqtt_password;

    #local_namespace;

    #eventing;
    #rpc;
    #watchdog;

    constructor(options){
        super();

        const namespace = _.get(options, "namespace", "default");
        if(!_.isString(namespace || !/^[a-z]+$/.test(namespace))){
            throw Error("Invalid namespace.");
        }
        this.#local_namespace = namespace;

        this.#mqtt_url      = _.get(options, "url");
        this.#mqtt_username = _.get(options, "username");
        this.#mqtt_password = _.get(options, "password");

        if(_.isNil(this.#mqtt_url)) throw Error("url cannot be empty.");
        

        this.#rpc = new WardenclyffeRPCDispatch({
            namespace,
        });

        this.#eventing_channels = new Map();


        this.#watchdog = new Watchdog({
            emission: _.get(options, "emitHeartbeat", false),
        });

        this.#clientId = "Wardenclyffe-" + uuidv4();
        debug("clientId=", this.#clientId);

        this.#watchdog.on("bark", ()=>{
            debug("Watchdog timed out.");

            if(_.isFunction(options.onWatchdogTimeout)){
                debug("Found watchdog callback function, invoke it.");
                options.onWatchdogTimeout();
            }
        })
    }

    connect(){
        debug("Connecting: " + this.#mqtt_url);

        this.#client = mqtt.connect(this.#mqtt_url, {
            username: _.isString(this.#mqtt_username) ? this.#mqtt_username : undefined,
            password: this.#mqtt_password ? Buffer.from(this.#mqtt_password, "ascii") : undefined,
            protocolVersion: 5,
            keepalive: 5,
            clean: false, // set to false to receive QoS 1&2 while offline
            clientId: this.#clientId,
        });        

        return new Promise((resolve, reject)=>{
            this.#client.once("error", (err)=>{
                reject(err);
            });

            this.#client.once("connect", ()=>{
                debug("MQTT connnected.");
                this.emit("connect");
                this.#bindEvents();
                resolve();
            });
        });        
    }

    #bindEvents(){
        let client = this.#client;
        if(_.isNil(client)) return;

        // for a given instance of client, don't bind events repeatly
        if(_.get(client, symbolEventsBound) !== true){
            client.on("reconnect", ()=>{
                debug("Reconnecting...");
            });

            client.on("offline", ()=>{
                debug("Client offline.");
            });

            client.on("error", (err)=>{
                debug("MQTT client error", err);
            });

            client.on("message", (a,b,c)=>this.#onMessage(a,b,c));
            client[symbolEventsBound] = true;
        }

        this.#rpc.bindEventsToClient(client);
        this.#watchdog.bindEventsToClient(client);

        for(let k in this.#eventing_channels){
            this.#eventing_channels[k].bindEventsToClient(client);
        }
    }

    #onMessage(topic, messageBuffer, packet){
        if(false !== this.#rpc.__onMessage(topic, messageBuffer, packet)){
            return;
        }
        for(let k in this.#eventing_channels){
            let r = this.#eventing_channels[k].__onMessage(
                topic, messageBuffer, packet);
            if(r === true) break;
        }
    }

    get rpc(){ return this.#rpc }


    #eventing_channels;

    eventing(channel_name){
        if(!channel_name) channel_name = this.#local_namespace;
        if(!this.#eventing_channels.has(channel_name)){
            let new_channel = new WardenclyffeEventingDispatch({
                namespace: channel_name,
            });
            this.#eventing_channels.set(channel_name, new_channel);
        }
        this.#bindEvents();
        return this.#eventing_channels.get(channel_name);
    }

    uneventing(channel_name){
        if(!channel_name) channel_name = this.#local_namespace;
        if(!this.#eventing_channels.has(channel_name)) return;

        let channel = this.#eventing_channels.get(channel_name);
        channel.destructor();

        this.#eventing_channels.delete(channel_name);
    }

}


export { Wardenclyffe };