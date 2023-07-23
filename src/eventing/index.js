import _ from "lodash";
import path from "path";



class WardenclyffeEventingDispatch {

    #channel_prefix_outgoing;
    #channel_prefix_incoming;

    constructor(options){
        const namespace = _.get(options, "namespace");

        this.#channel_prefix_outgoing = "/wardenclyffe/sub/" + namespace + "/";
        this.#channel_prefix_incoming = "/wardenclyffe/pub/" + namespace + "/";
    }

    bindEventsToClient(client){
        client.subscribe(
            path.posix.join(this.#channel_prefix_incoming, "#"),
            { qos: 2 }
        );
    }

    onMessage(topic, messageBuffer, messagePacket){
        if(!_.startsWith(topic, this.#channel_prefix_incoming)) return false;

    }

}

export default WardenclyffeEventingDispatch;