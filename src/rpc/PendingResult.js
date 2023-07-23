import events from "events";


class PendingResult extends events.EventEmitter {

    #resolve;
    #reject;
    #finished;

    constructor(resolve, reject, options){
        super();
        this.#resolve = resolve;
        this.#reject = reject;
        this.#finished  = false;

        this.#setTimeout(options);
    }

    #setTimeout(options){
        const timeout = _.get(options, "timeout") || 5000;
        setTimeout(()=>{
            this.reject(Error("timeout"));
        }, timeout);
    }

    resolve(){
        if(this.#finished) return;
        this.#finished = true;
        this.#resolve.apply(this, [...arguments]);
        this.emit("finished");
    }
    
    reject(){
        if(this.#finished) return;
        this.#finished = true;
        this.#reject.apply(this, [...arguments]);
        this.emit("finished");
    }
}

export default PendingResult;