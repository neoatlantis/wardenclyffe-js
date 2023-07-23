import events from "events";


class PendingResult extends events.EventEmitter {

    #resolve;
    #reject;

    constructor(resolve, reject, options){
        super();
        this.#resolve = resolve;
        this.#reject = reject;

        this.#setTimeout(options);
    }

    #setTimeout(options){
        const timeout = _.get(options, "timeout") || 5000;
        setTimeout(()=>{
            this.reject(Error("timeout"));
        }, timeout);
    }

    resolve(){
        this.emit("finished");
        return this.#resolve.apply(this, [...arguments]);
    }
    
    reject(){
        this.emit("finished");
        return this.#reject.apply(this, [...arguments]);
    }
}

export default PendingResult;