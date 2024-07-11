/* eslint-disable react/style-prop-object */
function createElement(type, props, ...children) {
    return {
        type,
        props: {
            ...props,
            children: children.map(child =>
            typeof child === "object" 
                ? child 
                : createTextElement(child)
            ),
        },
    }
}


function createTextElement(text) {
    return {
        type: "TEXT_ELEMENT",
        props: {
            nodeValue: text,
            children: [],
        }
    };
}


function createDom(fibre) {
    const dom = fibre.type === "TEXT_ELEMENT"
        ? document.createTextNode("")
        : document.createElement(fibre.type);

    updateDom(dom, {}, fibre.props)

    return dom;
}


const isEvent = key => key.startsWith("on")

const isProperty = key => key !== "children" && !isEvent(key)

const isNew = (prev, next) => key => prev[key] !== next[key]

const isGone = (prev, next) => key => !(key in next)


function updateDom(dom, prevProps, nextProps) {

    Object.keys(prevProps)
        .filter(isEvent)
        .filter(
            key =>
                !(key in nextProps)||
                isNew(prevProps, nextProps)(key)
        )
        .forEach(name => {
            const eventType = name.toLowerCase().substring(2)
            dom.removeEventListener(eventType, prevProps[name])
        })

    Object.keys(prevProps)
        .filter(isProperty)
        .filter(isGone(prevProps, nextProps))
        .forEach(name => {
            dom[name] = ""
        })
    
    Object.keys(nextProps)
        .filter(isProperty)
        .filter(isNew(prevProps, nextProps))
        .forEach(name => {
            dom[name] = nextProps[name];
        })

    Object.keys(nextProps)
        .filter(isEvent)
        .filter(isNew(prevProps, nextProps))
        .forEach(name => {
            const eventType = name.toLowerCase().substring(2)
            dom.addEventListener(eventType, nextProps[name])
        })
}


function commitRoot() {
    deletions.forEach(commitWork);
    commitWork(wipRoot.child);
    currentRoot = wipRoot;
    wipRoot = null;
}
  

function commitWork(fibre) {
    if (!fibre) {
      return
    }

    let domParentFibre = fibre.parent
    while (!domParentFibre.dom) {
        domParentFibre = domParentFibre.parent
    }
    const domParent = domParentFibre.dom

    if (fibre.effectTag === "PLACEMENT" && fibre.dom != null) {
        domParent.appendChild(fibre.dom);
    } 
    else if (fibre.effectTag === "UPDATE" && fibre.dom != null) {
        updateDom(fibre.dom, fibre.alternate.props, fibre.props);
    } 
    else if (fibre.effectTag === "DELETION") {
        commitDeletion(fibre, domParent)
    }

    commitWork(fibre.child);
    commitWork(fibre.sibling);
}


function commitDeletion(fibre, domParent) {
    if (fibre.dom) {
        domParent.removeChild(fibre.dom)
    } else {
        commitDeletion(fibre.child, domParent)
    }
}


function render(element, container) {
    wipRoot = {
        dom: container,
        props: {
            children: [element],
        },
        alternate: currentRoot,
    }
    deletions = [];
    nextUnitOfWork = wipRoot;
}


let nextUnitOfWork = null;
let wipRoot = null;
let currentRoot = null;
let deletions = null;


function workLoop(deadline) {
    let shouldYield = false;
    while (nextUnitOfWork && !shouldYield) {
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
        shouldYield = deadline.timeRemaining() < 1;
    }

    if(!nextUnitOfWork && wipRoot) {
        commitRoot()
    }

    requestIdleCallback(workLoop);
}


requestIdleCallback(workLoop);


function performUnitOfWork(fibre) {
    const isFunctionComponent = fibre.type instanceof Function
    if(isFunctionComponent) {
        updateFunctionComponent(fibre)
    } else{
        updateHostComponent(fibre)
    }

    if(fibre.child) {
        return fibre.child
    }

    let nextFibre = fibre;

    while(nextFibre) {
        if(nextFibre.sibling) {
            return nextFibre.sibling
        }
        nextFibre = nextFibre.parent
    }
}


let wipFibre = null;
let hookIndex = null;


function updateFunctionComponent(fibre) {
    wipFibre = fibre;
    hookIndex = 0;
    wipFibre.hooks = [];
    const children = [fibre.type(fibre.props)];
    reconcileChildren(fibre, children);
}


function updateHostComponent(fibre) {
    if(!fibre.dom) {
        fibre.dom = createDom(fibre);
    }
    reconcileChildren(fibre, fibre.props.children);
}


function useState(initial) {
    const oldHook =
        wipFibre.alternate &&
        wipFibre.alternate.hooks &&
        wipFibre.alternate.hooks[hookIndex]

    const hook = {
        state: oldHook ? oldHook.state : initial,
        queue: [],
    }

    const actions = oldHook ? oldHook.queue : []
    actions.forEach(action => {
        hook.state = action(hook.state)
    })
    
    const setState = action => {
        hook.queue.push(action);
        wipRoot = {
            dom: currentRoot.dom,
            props: currentRoot.props,
            alternate: currentRoot,
        };
        nextUnitOfWork = wipRoot;
        deletions = [];
    }

    wipFibre.hooks.push(hook);
    hookIndex++;
    return [hook.state, setState]
}


function reconcileChildren(wipFibre, elements) {

    let index = 0;
    let oldFibre = wipFibre.alternate && wipFibre.alternate.child;
    let prevSibling = null;

    while(index < elements.length || oldFibre != null) {
        const element = elements[index];
        let newFibre = null;

        const sameType = oldFibre && element && element.type === oldFibre.type;

        if(sameType){
            newFibre = {
                type: oldFibre.type,
                props: element.props,
                dom: oldFibre.dom,
                parent: wipFibre,
                alternate: oldFibre,
                effectTag: "UPDATE",
            }
        }
        if (element && !sameType){
            newFibre = {
                type: element.type,
                props: element.props,
                dom: null,
                parent: wipFibre,
                alternate: null,
                effectTag: "PLACEMENT",
            }
        }
        if (oldFibre && !sameType) {
            oldFibre.effectTag = "DELETION"
            deletions.push(oldFibre)
        }

        if(oldFibre) {
            oldFibre = oldFibre.sibling
        }

        if(index === 0) {
            wipFibre.child = newFibre
        } else if (element) {
            prevSibling.sibling = newFibre
        }

        prevSibling = newFibre;
        index++;
    }
}




const notReact = {
    createElement,
    render,
    useState
};

/** @jsxRuntime classic */
/** @jsx notReact.createElement */
function Counter() {
    const [state, setState] = notReact.useState(1)
    return (
        <div>
            <h1> Count: {state} </h1>
            <button onClick={() => setState(c => c + 1)} > 
                Click me
            </button>
        </div>
    )
}
const element = <Counter />
const container = document.getElementById("root")
notReact.render(element, container)



