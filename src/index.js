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
        )
    }
    };
}


function createTextElement(text) {
    return {
    type: "TEXT_ELEMENT",
    props: {
        nodeValue: text,
        children: []
    }
    };
}


function createDom(fibre) {
    const dom = fibre.type === "TEXT_ELEMENT"
        ? document.createTextNode("")
        : document.createElement(fibre.type);

    const isProperty = key => key !== "children";
    Object.keys(fibre.props)
    .filter(isProperty)
    .forEach(name => {
        dom[name] = fibre.props[name];
    });

    return dom;
}


function commitRoot() {
    commitWork(wipRoot.child)
    currentRoot = wipRoot;
    wipRoot = null;
  }
  
  function commitWork(fibre) {
    if (!fibre) {
      return
    }
    const domParent = fibre.parent.dom
    domParent.appendChild(fibre.dom)
    commitWork(fibre.child)
    commitWork(fibre.sibling)
  }


function render(element, container) {
    wipRoot = {
        dom: container,
        props: {
            children: [element],
        },
        alternate: currentRoot,
    }
    nextUnitOfWork = wipRoot;
}


let nextUnitOfWork = null;
let wipRoot = null;
let currentRoot = null;


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
    let prevSibling = null;

    while(index < elements.length) {
        const element = elements[index]

        const newFibre = {
            type: element.type,
            props: elements.props,
            parent: wipFibre,
            dom: null,
        }

        if(index === 0) {
            wipFibre.child = newFibre
        } else {
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
const element = (
    <div style="background: aliceblue">
    <h1>Hello World</h1>
    <h2 style="text-align:right">notReact</h2>
    </div>
);
const container = document.getElementById("root");
notReact.render(element, container);
