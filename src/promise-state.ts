export enum Status {
    resolved = 'resolved',
    rejected = 'rejected',
    pending = 'pending',
}

interface Mapper<R, T> {
    pending?(): Resolvable<T>;
    resolved?(r: R): Resolvable<T>;
    rejected?(e: any): Resolvable<T>;
}

type Resolvable<T> = T | PromiseState<T>;

type PromiseValue<P> = P extends PromiseState<infer V> ? V: P;
type All = <A extends readonly PromiseState<any>[]>(...vals: A)
    => PromiseState<{ -readonly [i in keyof A]: PromiseValue<A[i]> }>;
type Race = <A extends readonly PromiseState<any>[]>(...vals: A)
    => PromiseState<A extends PromiseState<infer V>[] ? V : A>;

/**
 * Immutable snapshot state of a Promise
 */
export default class PromiseState<R> {
    static pending = new PromiseState<never>(Status.pending);
    static resolve: <R>(r: Resolvable<R>) => PromiseState<R>;
    static reject: (error: any) => PromiseState<never>;

    static all: All = (...targets) =>
        targets.find(p => p.isRejected) ||
            targets.find(p => p.isPending) ||
            PromiseState.resolve(targets.map(p => p.value));

    static race: Race = (...targets) =>
        targets.find(p => p.isFulfilled) || targets[0];

    static subscribe<T>(
        promiseOrFn: Promise<T>|(() => Promise<T>),
        ...subscribers: ((p: PromiseState<T>) => void)[]
    ): void {
        const promise = (promiseOrFn instanceof Function)? promiseOrFn(): promiseOrFn;
        subscribers.forEach(subscriber => {
            subscriber(PromiseState.pending);
            promise.then(
                r => subscriber(PromiseState.resolve(r)),
                e => {
                    subscriber(PromiseState.reject(e));
                    return null; // Unused - prevents UnhandledPromiseRejectionWarning
                });
        });
    }

    readonly status: Status;
    readonly value?: R;
    readonly error?: any;

    constructor(status: Status) {
        this.status = status;
    }

    get isPending(): boolean {
        return this.status === Status.pending;
    }

    get isResolved(): boolean {
        return this.status === Status.resolved;
    }

    get isRejected(): boolean {
        return this.status === Status.rejected;
    }

    get isFulfilled(): boolean {
        return this.isRejected || this.isResolved
    }

    private when<T, D=null>(m: Mapper<R, T>, defaultValue: Resolvable<D> = null): PromiseState<T|D> {
        const mapper = {
            pending: m.pending,
            resolved: m.resolved && (() => m.resolved(this.value)),
            rejected: m.rejected && (() => m.rejected(this.error)),
        }[this.status];

        let result;
        try{
            result = PromiseState.resolve(mapper? mapper(): defaultValue);
        }
        catch(e) {
            result = PromiseState.reject(e);
        }
        return this.equals(result) ? this : result;
    }

    fold<T, D=null>(m: Mapper<R, T>, defaultValue: Resolvable<D> = null): T|D {
        return this.when(m, defaultValue).value;
    }

    ifPending<T>(supplier: Mapper<R, T>['pending']): PromiseState<R|T> {
        return this.when({ pending: supplier }, this);
    }

    then<T>(mapper: Mapper<R, T>['resolved'], errorMapper?: Mapper<R, T>['rejected']): PromiseState<T> {
        return this.when({
            resolved: mapper,
            rejected: errorMapper
        }, this) as PromiseState<T>;
    }

    catch<T>(mapper?: Mapper<R, T>['rejected']): PromiseState<R|T> {
        return this.when({rejected: mapper}, this)
    }

    finally<T>(supplier?: () => Resolvable<T>): PromiseState<R|T> {
        return this.then(supplier, supplier);
    }

    get(): R {
        throw new Error('Progress not completed')
    }

    equals(progress: PromiseState<unknown>): boolean {
        if(this == progress) return true;
        return progress &&
            progress instanceof PromiseState &&
            this.status === progress.status &&
            this.value === progress.value &&
            this.error === progress.error;
    }
}

class Resolved<R> extends PromiseState<R> {
    readonly value: R;

    constructor(result: R) {
        super(Status.resolved);
        this.value = result
    }

    get(): R {
        return this.value
    }
}

class Rejected extends PromiseState<never>{
    readonly error: any;

    constructor(error?: any) {
        super(Status.rejected);
        this.error = error
    }

    get(): never {
        throw this.error
    }
}

PromiseState.resolve = r => {
    if(r instanceof PromiseState) {
        return r;
    }
    return new Resolved(r);
};
PromiseState.reject = error => new Rejected(error);