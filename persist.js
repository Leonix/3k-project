
var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
var observer = new MutationObserver(function(mutations) {
        saveState();
  });


  const storagePrefix = "state.";
  const propertyPrefix = "$property.";

  var watchedElements ={
      '#chord-color':propertyPrefix+'value',
      '#tonic-enabled':propertyPrefix+'checked',
      '#tonic-degree-enabled':propertyPrefix+'checked',

      '#alt-color':propertyPrefix+'value',
      '#alt-enabled':propertyPrefix+'checked',
      '#fretboard-show':propertyPrefix+'checked',
      '#longboard-show':propertyPrefix+'checked',
      '#keyboard-show':propertyPrefix+'checked',

      '#tonic-color':propertyPrefix+'value',

      '#label-size':propertyPrefix+'value',
      '#label-color':propertyPrefix+'value',

      '#overall-label-size':propertyPrefix+'value',
      '#overall-label-placement':propertyPrefix+'value',

      '#arrow-color':propertyPrefix+'value',
      '#arrow-thickness':propertyPrefix+'value',
      '#arrow-simplification':propertyPrefix+'value',
      '#arrow-transparency':propertyPrefix+'value',
      '#arrow-snap':propertyPrefix+'checked',
      '#fill-circlefill':propertyPrefix+'checked',

      '#fill-bgcolor':propertyPrefix+'value',
      '#fill-margin':propertyPrefix+'value',
      '#settings-width':propertyPrefix+'value',
  };

  var persistedObjects = new Object();
  var persistedObjectsCallbacks = new Object();
  var persistedObjectsBeforeRestoreCallbacks = {};

window.addEventListener('load', function () {
    setTimeout(function() {
        restoreState();

        //Start observing attribute changes on persisted elements

        for (const selector in watchedElements) {

            var target = document.querySelector(selector);

            if(null == target)
                continue;
            
            target.addEventListener('input', function(){saveState();});

            observer.observe(target,{attributes:true});
        }

        redraw();
    }, 50); // longboard and other controls are not ready to restore their state immediately
});

const fallback = a => a;

function persistObject(key, target, onRestored, onBeforeRestored)
{
    persistedObjects[key] = target;
    persistedObjectsCallbacks[key] = onRestored;
    persistedObjectsBeforeRestoreCallbacks[key] = onBeforeRestored || fallback;
}

function createStateSnapshot(){

    var snapshot = {
        objects:JSON.stringify(persistedObjects),
        elements:{},
        arrows:Array.from(activeArrows),
        labels:Array.from(activeLabels),
        keys: JSON.stringify(keys),
        circle: JSON.stringify(chordDefinitions),
        circleParameters: JSON.stringify(circleParameters),
        activeCanvasName: activeCanvasName,
        activeModeName: activeModeName
    };

    for (const selector in watchedElements) {

        var attributeOrProperty = watchedElements[selector];

        var target = document.querySelector(selector);

        if(null == target)
            continue;
        
        var value = target.getAttribute(attributeOrProperty);

        if(attributeOrProperty.startsWith(propertyPrefix))
            value = target[attributeOrProperty.substring(propertyPrefix.length)];

        snapshot.elements[storagePrefix+selector] =JSON.stringify(value);
    }

    return snapshot;
}

function restoreStateSnapshot(snapshot, cb){

    for (const selector in watchedElements) {

        var attributeOrProperty = watchedElements[selector];
        var value = snapshot.elements[storagePrefix+selector];

        if(undefined === value)
            continue;

        value = JSON.parse(value);

        var target = document.querySelector(selector);

        if(null == target)
            continue;
        
        if(attributeOrProperty.startsWith(propertyPrefix))
            target[attributeOrProperty.substring(propertyPrefix.length)] = value;
        else
            target.setAttribute(attributeOrProperty,value);
    }

    const oldStates = snapshot.objects;

    if(undefined === oldStates)
        return;

    const restored = JSON.parse(oldStates);

    for (var key in persistedObjects) {
        
        if(!restored.hasOwnProperty(key))
            continue;
        
        let restoredItem = restored[key];
        
        if(persistedObjectsBeforeRestoreCallbacks.hasOwnProperty(key))
            restoredItem = persistedObjectsBeforeRestoreCallbacks[key](restoredItem);
        
        Object.assign(persistedObjects[key],restoredItem);        
    }

    if(Array.isArray(snapshot.arrows))
        activeArrows = Array.from(snapshot.arrows);
    if(Array.isArray(snapshot.labels))
        activeLabels = Array.from(snapshot.labels);
    if(typeof snapshot.keys!= 'undefined' && snapshot.keys!=null)
        keys = JSON.parse(snapshot.keys);
    if(typeof snapshot.circle!= 'undefined' && snapshot.circle!=null)
    {
        const restoredCircle = JSON.parse(snapshot.circle);

        for (let i = 0; i < chordDefinitions.length; i++) {
            Object.assign(chordDefinitions[i],restoredCircle[i]);
        }
        
    }
    if (typeof snapshot.circleParameters != 'undefined' && snapshot.circleParameters) {
        const restoredCircleParameters = JSON.parse(snapshot.circleParameters);
        Object.assign(circleParameters, restoredCircleParameters);
    }
    if (typeof snapshot.activeCanvasName != 'undefined') {
        activeCanvasName = snapshot.activeCanvasName;
        showCanvasAccordingToMode(activeCanvasName);
    }
    if (typeof snapshot.activeModeName != 'undefined') {
        activeModeName = snapshot.activeModeName;
        
        let $checkbox = document.getElementById(activeModeName);
        if (!$checkbox) {
            activeModeName = 'mode-basetone';
            $checkbox = document.getElementById(activeModeName);
        }
        if ($checkbox) {
            $checkbox.checked = true;
            changemode($checkbox);
        }
    }

    window.setTimeout(function() {
        for (var key in persistedObjects) {
            persistedObjectsCallbacks[key]();
        }
        if (cb) {
            cb();
        }
        return false;
    }, 100); //hack
}

function saveState()
{
    localStorage.setItem('lastState',JSON.stringify(createStateSnapshot()));
}

function restoreState()
{
    var value = localStorage.getItem('lastState');

    if(undefined === value)
        return;

    var snapshot = JSON.parse(value);
    if (!snapshot) {
        return;
    }

    //Dont restore arrow state on regular persist event
    snapshot.arrows= [];
    snapshot.labels=[];
    snapshot.keys = null;
    snapshot.circle = null;

    restoreStateSnapshot(snapshot);
}