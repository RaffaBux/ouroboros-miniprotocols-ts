import { Cbor, CborObj } from "@harmoniclabs/cbor";
import { MiniProtocol } from "../../MiniProtocol";
import { AddEvtListenerOpts } from "../../common/AddEvtListenerOpts";
import { ErrorListener } from "../../common/ErrorListener";
import { Multiplexer } from "../../multiplexer";
import { QryAcquire } from "./QryAcquire";
import { QryAcquired } from "./QryAcquired";
import { QryDone } from "./QryDone";
import { QryFailure } from "./QryFailure";
import { QryMessage, isQryMessage, localStateQueryMessageFromCborObj } from "./QryMessage";
import { QryQuery } from "./QryQuery";
import { QryReAcquire } from "./QryReAcquire";
import { QryRelease } from "./QryRelease";
import { QryResult } from "./QryResult";
import { toHex } from "@harmoniclabs/uint8array-utils";
import { IChainPoint } from "../types/ChainPoint";


const roDescr = Object.freeze({
    writable: false,
    enumerable: true,
    configurable: false
});

type LocalStateQueryEvtListener<Msg extends QryMessage = QryMessage> = ( msg: Msg ) => void;

/*
export type QryMessage
    = QryAcquire
    | QryFailure
    | QryAcquired
    | QryReAcquire
    | QryQuery
    | QryResult
    | QryRelease
    | QryDone
 */
type LocalStateQueryEvtListeners = {
    acquire     : LocalStateQueryEvtListener<QryAcquire>[]
    failure     : LocalStateQueryEvtListener<QryFailure>[]
    acquired    : LocalStateQueryEvtListener<QryAcquired>[]
    reacquire   : LocalStateQueryEvtListener<QryReAcquire>[]
    query       : LocalStateQueryEvtListener<QryQuery>[]
    result      : LocalStateQueryEvtListener<QryResult>[]
    release     : LocalStateQueryEvtListener<QryRelease>[]
    done        : LocalStateQueryEvtListener<QryDone>[]
    error       : ErrorListener[]
};

function _clearListeners( listeners: LocalStateQueryEvtListeners, evt?: LocalStateQueryEvtName ): void
{
    if( isLocalStateQueryEvtName( evt ) )
    {
        listeners[evt].length = 0;
        return;
    }

    listeners.acquire.length    = 0;
    listeners.failure.length    = 0;
    listeners.acquired.length   = 0;
    listeners.reacquire.length  = 0;
    listeners.query.length      = 0;
    listeners.result.length     = 0;
    listeners.release.length    = 0;
    listeners.done.length       = 0;
    listeners.error.length      = 0;

    return;
}

function _hasEventListeners( listeners: LocalStateQueryEvtListeners, includeError: boolean ): boolean
{
    return (includeError ? listeners.error.length > 0 : true) && (
            listeners.acquire.length    > 0 ||
            listeners.failure.length    > 0 ||
            listeners.acquired.length   > 0 ||
            listeners.reacquire.length  > 0 ||
            listeners.query.length      > 0 ||
            listeners.result.length     > 0 ||
            listeners.release.length    > 0 ||
            listeners.done.length       > 0
    );
}

type LocalStateQueryEvtName = keyof LocalStateQueryEvtListeners;

type MsgOf<EvtName extends LocalStateQueryEvtName> =
    EvtName extends "acquire"   ? QryAcquire :
    EvtName extends "failure"   ? QryFailure :
    EvtName extends "acquired"  ? QryAcquired :
    EvtName extends "reacquire" ? QryReAcquire :
    EvtName extends "query"     ? QryQuery :
    EvtName extends "result"    ? QryResult :
    EvtName extends "release"   ? QryRelease :
    EvtName extends "done"      ? QryDone :
    EvtName extends "error"     ? Error :
    never;
    
type EvtListenerOf<EvtName extends LocalStateQueryEvtName> =
    EvtName extends "acquire"   ? LocalStateQueryEvtListener<QryAcquire> :
    EvtName extends "failure"   ? LocalStateQueryEvtListener<QryFailure> :
    EvtName extends "acquired"  ? LocalStateQueryEvtListener<QryAcquired> :
    EvtName extends "reacquire" ? LocalStateQueryEvtListener<QryReAcquire> :
    EvtName extends "query"     ? LocalStateQueryEvtListener<QryQuery> :
    EvtName extends "result"    ? LocalStateQueryEvtListener<QryResult> :
    EvtName extends "release"   ? LocalStateQueryEvtListener<QryRelease> :
    EvtName extends "done"      ? LocalStateQueryEvtListener<QryDone> :
    EvtName extends "error"     ? ErrorListener :
    never;

function isLocalStateQueryEvtName( str: any ): str is LocalStateQueryEvtName
{
    return (
        str === "acquire"   ||
        str === "failure"   ||
        str === "acquired"  ||
        str === "reacquire" ||
        str === "query"     ||
        str === "result"    ||
        str === "release"   ||
        str === "done"      ||
        str === "error"
    );
}

function msgToName( msg: QryMessage ): LocalStateQueryEvtName | undefined
{

    if( msg instanceof QryAcquire ) return "acquire";
    if( msg instanceof QryFailure ) return "failure";
    if( msg instanceof QryAcquired ) return "acquired";
    if( msg instanceof QryReAcquire ) return "reacquire";
    if( msg instanceof QryQuery ) return "query";
    if( msg instanceof QryResult ) return "result";
    if( msg instanceof QryRelease ) return "release";
    if( msg instanceof QryDone ) return "done";

    return undefined;
}

const lsqClientHeader = Object.freeze({
    hasAgency: true,
    protocol: MiniProtocol.LocalStateQuery
});

export class LocalStateQueryClient
{
    readonly mplexer: Multiplexer;

    clearListeners!: ( event?: LocalStateQueryEvtName ) => this;

    addEventListener:    <EvtName extends LocalStateQueryEvtName>( eventName: EvtName, listener: EvtListenerOf<EvtName>, options?: AddEvtListenerOpts ) => this
    addListener:         <EvtName extends LocalStateQueryEvtName>( eventName: EvtName, listener: EvtListenerOf<EvtName> ) => this
    on:                  <EvtName extends LocalStateQueryEvtName>( eventName: EvtName, listener: EvtListenerOf<EvtName> ) => this
    once:                <EvtName extends LocalStateQueryEvtName>( eventName: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeEventListener: <EvtName extends LocalStateQueryEvtName>( eventName: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeListener:      <EvtName extends LocalStateQueryEvtName>( eventName: EvtName, listener: EvtListenerOf<EvtName> ) => this
    off:                 <EvtName extends LocalStateQueryEvtName>( eventName: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeAllListeners:  ( event   ?: LocalStateQueryEvtName ) => this
    emit:                <EvtName extends LocalStateQueryEvtName>( eventName: EvtName, msg: MsgOf<EvtName> ) => boolean
    dispatchEvent:       <EvtName extends LocalStateQueryEvtName>( eventName: EvtName, msg: MsgOf<EvtName> ) => boolean
    
    constructor( multiplexer: Multiplexer )
    {
        const self = this;

        const eventListeners: LocalStateQueryEvtListeners = {
            acquire: [],
            failure: [],
            acquired: [],
            reacquire: [],
            query: [],
            result: [],
            release: [],
            done: [],
            error: []
        };

        const onceEventListeners: LocalStateQueryEvtListeners = {
            acquire: [],
            failure: [],
            acquired: [],
            reacquire: [],
            query: [],
            result: [],
            release: [],
            done: [],
            error: []
        };

        function clearListeners( eventName?: LocalStateQueryEvtName ): typeof self
        {
            if( isLocalStateQueryEvtName( eventName ) )
            {
                eventListeners[eventName].length = 0;
                onceEventListeners[eventName].length = 0;
                return self;
            }
            _clearListeners( eventListeners );
            _clearListeners( onceEventListeners );

            return self;
        }

        function hasEventListeners( includeError: boolean = false ): boolean
        {
            return (
                _hasEventListeners( eventListeners, includeError ) ||
                _hasEventListeners( onceEventListeners, includeError ) 
            );
        }

        function addEventListenerOnce( eventName: LocalStateQueryEvtName, listener: LocalStateQueryEvtListener ): typeof self
        {
            if( !isLocalStateQueryEvtName( eventName ) ) return self;

            onceEventListeners[ eventName ].push( listener as any );
            return self;
        }
        function addEventListener( eventName: LocalStateQueryEvtName, listener: LocalStateQueryEvtListener, opts?: AddEvtListenerOpts ): typeof self
        {
            if( opts?.once === true ) return addEventListenerOnce( eventName, listener );
            
            if( !isLocalStateQueryEvtName( eventName ) ) return self;
            
            eventListeners[ eventName ].push( listener as any );
            return self;
        }
        function removeEventListener( eventName: LocalStateQueryEvtName, listener: LocalStateQueryEvtListener ): typeof self
        {
            if( !isLocalStateQueryEvtName( eventName ) ) return self;

            eventListeners[eventName] = eventListeners[eventName].filter( fn => fn !== listener ) as any;
            onceEventListeners[eventName] = onceEventListeners[eventName].filter( fn => fn !== listener ) as any;
            return self; 
        }

        function dispatchEvent( eventName: LocalStateQueryEvtName, msg: QryMessage | Error ): boolean
        {
            // console.log( eventName, msg );
            if( !isLocalStateQueryEvtName( eventName ) ) return true;
            if( eventName !== "error" && !isQryMessage( msg ) ) return true;

            const listeners = eventListeners[ eventName ];
            const nListeners = listeners.length;
            for(let i = 0; i < nListeners; i++)
            {
                listeners[i](msg as any);
            }

            const onceListeners = onceEventListeners[eventName];
            while( onceListeners.length > 0 )
            {
                onceListeners.shift()!(msg as any);
            }

            return true;
        }

        Object.defineProperties(
            this, {
                mplexer:                { value: multiplexer, ...roDescr },
                clearListeners:         { value: clearListeners, ...roDescr },
                removeAllListeners:     { value: clearListeners, ...roDescr },
                addEventListener:       { value: addEventListener, ...roDescr },
                addListener:            { value: addEventListener, ...roDescr },
                on:                     { value: addEventListener, ...roDescr },
                once:                   { value: addEventListenerOnce, ...roDescr },
                removeEventListener:    { value: removeEventListener, ...roDescr },
                removeListener:         { value: removeEventListener, ...roDescr },
                off:                    { value: removeEventListener, ...roDescr },
                dispatchEvent:          { value: dispatchEvent, ...roDescr },
                emit:                   { value: dispatchEvent, ...roDescr },
            }
        );

        let prevBytes: Uint8Array | undefined = undefined;
        const queque: QryMessage[] = [];

        multiplexer.on( MiniProtocol.LocalStateQuery, chunk => {

            if( !hasEventListeners() ) return;

            let offset: number = -1;
            let thing: { parsed: CborObj, offset: number };

            let msg: QryMessage;

            if( prevBytes )
            {
                const tmp = new Uint8Array( prevBytes.length + chunk.length );
                tmp.set( prevBytes, 0 );
                tmp.set( chunk, prevBytes.length );
                chunk = tmp;
                prevBytes = undefined;
            }

            while( offset < chunk.length )
            {
                try {
                    thing = Cbor.parseWithOffset( chunk );
                }
                catch
                {
                    // assume the error is of "missing bytes";
                    prevBytes = Uint8Array.prototype.slice.call( chunk );
                    break;
                }
                
                offset = thing.offset;

                // console.log( "msg byetes", offset, toHex( chunk.subarray( 0, offset ) ) );
                try {
                    msg = localStateQueryMessageFromCborObj( thing.parsed );
                    // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.ts(2540)
                    msg.cborBytes = Uint8Array.prototype.slice.call( chunk, 0, offset );
                    
                    queque.unshift( msg );
                }
                catch (e)
                {
                    const err = typeof e?.message === "string" ? 
                        new Error(
                            e.message +
                            "\ndata: " + toHex( chunk ) + "\n"
                        ):
                        new Error(
                            "\ndata: " + toHex( chunk ) + "\n"
                        )
                    dispatchEvent("error", err );
                }

                if( offset < chunk.length )
                {
                    // reference same memory (`subarray`)
                    // ignore the parsed bytes
                    chunk = chunk.subarray( offset );
                }
            }

            let msgStr: LocalStateQueryEvtName;
            while( msg = queque.pop()! )
            {
                msgStr = msgToName( msg )!;
                if( !msgStr ) continue; // ingore messages not expected by the client

                dispatchEvent( msgStr, msg );
            }
        });
    }

    acquire( point?: IChainPoint ): void
    {
        this.mplexer.send(
            new QryAcquire({ point }).toCbor().toBuffer(),
            lsqClientHeader
        );
    }

    query( query: CborObj ): void
    {
        this.mplexer.send(
            new QryQuery({ query }).toCbor().toBuffer(),
            lsqClientHeader
        );
    }

    release(): void
    {
        this.mplexer.send(
            new QryRelease().toCbor().toBuffer(),
            lsqClientHeader
        )
    }

    done(): void
    {
        this.mplexer.send(
            new QryDone().toCbor().toBuffer(),
            lsqClientHeader
        );
        this.clearListeners();
    }
}