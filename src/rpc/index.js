import _ from "lodash";
import { v4 as uuidv4 } from "uuid";
import path from "path";

import PendingResult from "./PendingResult";


const GENERAL_RESPONSES_PREFIX = "/wardenclyffe/res/";
const GENERAL_REQUESTS_PREFIX  = "/wardenclyffe/req/";


class WardenclyffeRPCDispatch {

    #client;

    #channel_prefix_responses;
    #channel_prefix_requests;

    #registrations; // new Map(): function name as topic (full string)->handler
    #pendingPromises; // new Map(): topic(full string)->PendingResult()

    constructor(options){
        const namespace = _.get(options, "namespace");

        // incoming responses from peer
        this.#channel_prefix_responses = 
            GENERAL_RESPONSES_PREFIX + namespace + "/";
        // incoming requests from peer
        this.#channel_prefix_requests =
            GENERAL_REQUESTS_PREFIX + namespace + "/";

        this.#registrations = new Map();
        this.#pendingPromises = new Map();
    }

    bindEventsToClient(client){
        client.subscribe(
            path.posix.join(this.#channel_prefix_responses, "#"),
            { qos: 1 }
        );
        client.subscribe(
            path.posix.join(this.#channel_prefix_requests, "#"),
            { qos: 2 }
        );
        this.#client = client;
    }

    onMessage(topic, messageBuffer, messagePacket){
        if(_.startsWith(topic, this.#channel_prefix_requests)){
            this.#onRequest(topic, messageBuffer, messagePacket);
        } else if(_.startsWith(topic, this.#channel_prefix_responses)){
            this.#onResponse(topic, messageBuffer, messagePacket);
        } else {
            // not for this module
            return false;   
        }
        return true;
    }

    #onRequest(topic, messageBuffer, messagePacket){
        if(!this.#registrations.has(topic)) return;
        
        const handler = this.#registrations.get(topic);
        const responseTopic = _.get(messagePacket, "properties.responseTopic");
        if(!_.startsWith(responseTopic, GENERAL_RESPONSES_PREFIX)){
            // not worthy processing.
            return;
        }

        (async () => {
            let result = null, is_error = false;
            try{
                let parameter = JSON.parse(messageBuffer.toString());
                result = await handler(parameter);
            } catch(e){
                result = e.message;
                is_error = true;
            }

            this.#client.publish(
                responseTopic,
                JSON.stringify(result),
                {
                    qos: 2,
                    properties: {
                        userProperties: {
                            is_error,
                        }
                    }
                }
            );
        })();
    }

    #onResponse(topic, messageBuffer, messagePacket){
        if(!this.#pendingPromises.has(topic)) return;
        
        const pendingResult = this.#pendingPromises.get(topic);
        const is_error = (
            _.get(messagePacket, "properties.userProperties.is_error") ==
            'true' // MQTT userProperties must be string
        );

        let result = null;
        try{
            result = JSON.parse(messageBuffer.toString());
        } catch(e){
            return pendingResult.reject(Error("Deserialization error."));
        }

        if(is_error){
            return pendingResult.reject(result);
        } else {
            return pendingResult.resolve(result);
        }
    }

    #getFullFunctionTopic(functionName, base){
        if(
            !_.isString(functionName) ||
            !/^[a-z0-9]+(\.[0-9a-z]+){0,}$/g.test(functionName)
        ){
            throw Error("Invalid function name: " + functionName);
        }
        functionName = functionName.replace(/\./g, "/");
        return path.posix.join(
            (_.isNil(base)?this.#channel_prefix_requests:base),
            functionName
        );
    }

    register(functionName, functionHandler){
        if(!_.isFunction(functionHandler)){
            throw Error("Handler function expected.");
        }
        const fullFunctionTopic = this.#getFullFunctionTopic(functionName);
        if(this.#registrations.has(fullFunctionTopic)){
            throw Error("Function already registered.");
        }
        this.#registrations.set(fullFunctionTopic, functionHandler);
        return this;
    }

    unregister(functionName){
        this.#registrations.delete(this.#getFullFunctionTopic(functionName));
        return this;
    }

    call(namespace, functionName, parameter, options){
        if(!this.#client || !this.#client.connected){
            // necessary, as otherwise unnecessary calls on MQTT will result
            // in burden and hinders reconnection schedule.
            throw Error("offline");
        }

        const remoteFullFunctionTopic = this.#getFullFunctionTopic(
            functionName,
            path.posix.join(GENERAL_REQUESTS_PREFIX, namespace)
        );
        // Generates response topic and records
        let responseTopic = path.posix.join(
            this.#channel_prefix_responses,
            uuidv4()
        );

        // Records callback function and sets timeout.
        let retPromise = new Promise((resolve, reject)=>{
            let pendingResult = new PendingResult(resolve, reject, options);
            this.#pendingPromises.set(responseTopic, pendingResult);
            pendingResult.once("finished", ()=>{
                this.#pendingPromises.delete(responseTopic);
            });
        });
        
        // Publish call, but if failed, reject above promise immediately.
        let publishTask = new Promise((resolve, reject)=>{
            try{
                this.#client.publish(
                    remoteFullFunctionTopic,
                    JSON.stringify(parameter),
                    {
                        qos: 2,
                        properties: {
                            responseTopic
                        }
                    },
                    (err)=>{
                        if(err) return reject(err);
                        resolve();
                    }
                );
            } catch(e){
                reject(e);
            }
        });
        publishTask.catch((e)=>{
            let pendingResult = this.#pendingPromises.get(responseTopic);
            if(pendingResult){
                pendingResult.reject(e);
            }
        });

        return retPromise;  
    }

}

export default WardenclyffeRPCDispatch;