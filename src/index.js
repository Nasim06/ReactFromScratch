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
    const domParent = fibre.parent.dom;
    if (fibre.effectTag === "PLACEMENT" && fibre.dom != null) {
        domParent.appendChild(fibre.dom);
    } 
    else if (fibre.effectTag === "UPDATE" && fibre.dom != null) {
        updateDom(fibre.dom, fibre.alternate.props, fibre.props);
    } 
    else if (fibre.effectTag === "DELETION") {
        domParent.removeChild(fibre.dom);
    }
    commitWork(fibre.child);
    commitWork(fibre.sibling);
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
    if(!fibre.dom) {
        fibre.dom = createDom(fibre)
    }

    const elements = fibre.props.children;
    reconcileChildren(fibre, elements);

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
    render
};

/** @jsxRuntime classic */
/** @jsx notReact.createElement */
const container = document.getElementById("root")
const updateValue = e => {
  rerender(e.target.value)
}
const rerender = value => {
  const element = (
    <div>
      <input onInput={updateValue} value={value} />
      <h2>Hello {value}</h2>
    </div>
  )
  notReact.render(element, container)
}
rerender("World")


// const element = (
//     <div style="background: aliceblue">
//     <h1>Hello World</h1>
//     <h2 style="text-align:right">notReact</h2>
//     </div>
// );

// const container = document.getElementById("root");
// notReact.render(element, container);
