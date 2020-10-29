import PromiseState from "./promise-state";
const error = new Error('bad stuff');

function defer() {
    const deferred = {} as any;
    deferred.promise = new Promise(function (resolve, reject) {
        deferred.resolve = resolve;
        deferred.reject = reject;
    });
    return deferred
}

describe('PromiseState', () => {
    describe('then', () => {
        it('should map resolved', () => {
            const {value} = PromiseState.resolve('foo')
                .then(x => `${x}-success`, x => `${x}-fail`);

            expect(value).toBe('foo-success');
        });

        it('should map error', () => {
            const {value} = PromiseState.reject(error)
                .then(x => `${x}-success`, x => `${x.message}-fail`);

            expect(value).toBe('bad stuff-fail');
        });

        it('should return same instance if same value', () => {
            const a = PromiseState.resolve('foo');
            const b = a.then(x => x);

            expect(a).toBe(b);
        });

        it('should no-op when pending', () => {
            expect(PromiseState.pending.then(() => 'foo')).toBe(PromiseState.pending);
        });
    });

    describe('ifPending', () => {
        it('should map if pending', () => {
            const {value} = PromiseState.pending.ifPending(() => 'it is pending');
            expect(value).toBe('it is pending');
        });

        it('should return self if not pending', () => {
            const {value} = PromiseState.resolve('foo').ifPending(() => 'it is pending');
            expect(value).toBe('foo');
        })
    })


    type MapToPromise<T> = T extends PromiseState<infer K>[] ? K : T;
    type Coordinate = [PromiseState<string>, PromiseState<number>];
    type PromiseCoordinate = MapToPromise<Coordinate>;

    describe('all', () => {
       it('should return successful results', () => {
           const {value} = PromiseState.all(
               PromiseState.resolve('a'),
               PromiseState.resolve('b'),
               PromiseState.resolve('c'),
           );

           expect(value).toEqual(['a', 'b', 'c']);
       });

        it('should return pending if one still pending', () => {
            const result = PromiseState.all(
                PromiseState.resolve('a'),
                PromiseState.resolve('b'),
                PromiseState.pending,
            );

            expect(result).toBe(PromiseState.pending);
        });

       it('should fail if an item fails', () => {
           const result = PromiseState.all(
               PromiseState.resolve('one'),
               PromiseState.resolve('two'),
               PromiseState.reject(error),
           );

           expect(result).toEqual(PromiseState.reject(error));
       });
    });

    describe('race', () => {
        it('should return first result', () => {
            const {value} = PromiseState.race(
                PromiseState.pending,
                PromiseState.resolve(42),
                PromiseState.resolve('foo'),
            );

            expect(value).toEqual(42);
        });
    });

    describe('subscribe', () => {
        let state: PromiseState<string> = null;
        let deferred;

        beforeEach(() => {
            deferred = defer();
            state = null;
            PromiseState.subscribe<string>(deferred.promise, s => state = s);
        });

        it('should capture resolved state', async () => {
            expect(state).toEqual(PromiseState.pending);
            await deferred.resolve('foo');
            expect(state).toEqual(PromiseState.resolve('foo'));
        });

        it('should capture rejected state', async () => {
            expect(state).toEqual(PromiseState.pending);
            await deferred.reject(error);
            expect(state).toEqual(PromiseState.reject(error));
        });
    });
});