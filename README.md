# promise-state-js
Immutable snapshot representation of es6 promise
 
## Install
`yarn add promise-state-js`

or

`npm install --save promise-state-js`

## Examples
### React hooks example (Typescript)
```tsx
import {useState} from "react";
import PromiseState from 'promise-state-js';

function UserDetails() {
    const [state, setState] = useState<PromiseState<User>>(null);
    
    useEffect(function initialize() {
        PromiseState.subscribe(fetch('/users'), setState);       
    }, []);
    
    return state?.fold({
        pending: () => <div>Loading user info...</div>,
        rejected: () => <div>Failed to load user</div>,
        resolved: user => <div>
            <div>Name: {user.name}</div>
            <div>Email: {email.name}</div>
        </div>, 
    });

}
```

### Redux+Thunk example (Typescript)
```ts
import PromiseState from 'promise-state-js';
import { ThunkDispatch } from 'redux-thunk';

const FETCH_USERS = 'FETCH_USERS';
const loadUser = () => (dispatch: ThunkDispatch) =>
    PromiseState.subscribe(fetch('/users'), state =>
        dispatch({ type: FETCH_USERS, state }));

function userReducer(state = null, action): PromiseState<User> {
  if(action.type === FETCH_USERS)
      return action.state;
  return state;
}
```

### Async/await
You can subscribe to a `promise`, as well as to an async function e.g.:
```javascript
PromiseState.subscribe(async function() {
    const login = await fetch('/current-login');
    return login ?? fetch(`/user/${login.userId}`);
}, setState);
```

## Usage
```javascript
import PromiseState from 'promise-state-js';
```

### Create instance
You can create instance through one of these:
```javascript
const resolved = PromiseState.resolve({ name: 'bob' });
const rejected = PromiseState.reject(Error(''));
const pending = PromiseState.pending;
```

`PromiseState` is immutable by design. Once instantiated there is no way to change its state.

### Instance properties

#### isResolved
`Boolean`. True if the instance object has `resolved` status.

#### isRejected
`Boolean`. True if the instance object has `rejected` status.

#### isFulfilled
`Boolean`. True if the instance object has `resolved` or `rejected` status.

#### isPending
`Boolean`. True if the instance object has `pending` status.

#### value
`R | void`. Obtains the value of resolved promise, else undefined.

#### error
`R | void`. Obtains error value of rejected promise, else undefined.


### Instance methods

#### then
`map<T>(mapper: (r: R) => T): PromiseState<T>`  
Allows to map over a value stored inside `PromiseState` object. Mapper applied only to successive instances.
Returns the new `PromiseState` object with transformed value inside.

```javascript
PromiseState
  .resolve(10)
  .then(x => x + 5, handleError)
  .value; // => 15
```

You can also return another PromiseState instance from the mapper function, i.e.:
```javascript
PromiseState
  .resolve(10)
  .then(x => x >= 0 ? x : PromiseState.reject(Error('negative value')))
  .value; // => 15
```

 #### fold
`fold<T>(folder: Folder<R, T>): T | null`  
Fold receives object (Folder) that specifies different actions for different `PromiseState` states.
Useful to applying side effects and reduce boilerplate code.

```jsx
promiseState.fold({
        pending: () => <div>Loading user info...</div>,
        rejected: () => <div>Failed to load user</div>,
        resolved: user => <div>
            <div>Name: {user.name}</div>
            <div>Email: {email.name}</div>
        </div>, 
    });
```

#### get
`get(): R`  
Extract the value from `PromiseState` if resolved, or throw if pending/rejected.

```javascript
PromiseState
  .resolve(10)
  .get(); // => 15

PromiseState
  .reject(Error('Some error'))
  .get(); // => throws
```


### Composition
`PromiseState` class has two static methods for composing many instances together.
API pretty similar to `PromiseState.all` and `PromiseState.race` methods.


#### all
`all(p1: PromiseState<P1>, p2: PromiseState<P2>, ...): PromiseState<[P1, P2, ...]>`
If all items are `resolved` then will return a `PromiseState` containing an array of all the resolved items.
Else will return `pending` or `rejected`.

```javascript
PromiseState.all(
  PromiseState.resolve(42),
  PromiseState.resolve('foo')
).value; // == [42, 'foo']
```

#### race
`race(p1: PromiseState<P1>, p2: PromiseState<P2>, ...): PromiseState<P1|P2|...>`  
Returns first fulfilled outcome (`resolved` or `rejected`).
If there are no complete items then will return the first item from arguments.
If arguments empty will return `undefined`.

```javascript
PromiseState.race(
  PromiseState.pending,
  PromiseState.resolve(42),
  PromiseState.resolve('foo')
).value; // == 42
```