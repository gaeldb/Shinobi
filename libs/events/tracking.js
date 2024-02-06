const movingThings = require('shinobi-node-moving-things-tracker').Tracker
module.exports = (config) => {
    const objectTrackers = {}
    const objectTrackerTimeouts = {}
    const peopleTags = new Set(config.peopleTags || ["person", "Person", "Man", "Woman", "Boy", "Girl"]);
    const trackedMatrices = {}
    function shiftSet(set) {
        for (const res of set) {
            set.delete(res);
            return res
        }
    }
    function resetObjectTracker(trackerId,matrices){
        const Tracker = movingThings.newTracker();
        objectTrackers[trackerId] = {
            frameCount: 1,
            tracker: Tracker,
            lastPositions: []
        }
        return objectTrackers[trackerId]
    }
    function setLastTracked(trackerId, trackedMatrices){
        const theTracker = objectTrackers[trackerId]
        theTracker.lastPositions = trackedMatrices
    }
    function getTracked(trackerId){
        const theTracker = objectTrackers[trackerId]
        const frameCount = theTracker.frameCount
        const trackedObjects = theTracker.tracker.getJSONOfTrackedItems().map((matrix) => {
            return {
                id: matrix.id,
                tag: matrix.name,
                x: matrix.x,
                y: matrix.y,
                width: matrix.w,
                height: matrix.h,
                confidence: matrix.confidence,
                isZombie: matrix.isZombie,
            }
        })
        return trackedObjects;
    }
    function trackObject(trackerId,matrices){
        if(!objectTrackers[trackerId]){
            resetObjectTracker(trackerId)
        }
        const mappedMatrices = matrices.map((matrix) => {
            return {
                x: matrix.x,
                y: matrix.y,
                w: matrix.width,
                h: matrix.height,
                confidence: matrix.confidence,
                name: matrix.tag,
            }
        });
        const theTracker = objectTrackers[trackerId]
        theTracker.tracker.updateTrackedItemsWithNewFrame(mappedMatrices, theTracker.frameCount);
        ++theTracker.frameCount
    }
    function trackObjectWithTimeout(trackerId,matrices){
        clearTimeout(objectTrackerTimeouts[trackerId]);
        objectTrackerTimeouts[trackerId] = setTimeout(() => {
            objectTrackers[trackerId].tracker.reset()
            delete(objectTrackers[trackerId])
            delete(objectTrackerTimeouts[trackerId])
        },1000 * 60);
        trackObject(trackerId,matrices);
    }
    function objectHasMoved(matrices, options = {}) {
      const { imgHeight = 1, imgWidth = 1, threshold = 0 } = options;
      for (let i = 0; i < matrices.length; i++) {
        const current = matrices[i];
        if (i < matrices.length - 1) {
          const next = matrices[i + 1];
          let totalDistanceMoved = 0;
          let numPointsCompared = 0;
          if (next) {
            // Compare each corner of the matrices
            const currentCorners = [
              { x: current.x, y: current.y },
              { x: current.x + current.width, y: current.y },
              { x: current.x, y: current.y + current.height },
              { x: current.x + current.width, y: current.y + current.height }
            ];
            const nextCorners = [
              { x: next.x, y: next.y },
              { x: next.x + next.width, y: next.y },
              { x: next.x, y: next.y + next.height },
              { x: next.x + next.width, y: next.y + next.height }
            ];
            for (let j = 0; j < currentCorners.length; j++) {
              const currentCorner = currentCorners[j];
              const nextCorner = nextCorners[j];
              const dx = nextCorner.x - currentCorner.x;
              const dy = nextCorner.y - currentCorner.y;
              const distanceMoved = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
              const distanceMovedPercent =
                (100 * distanceMoved) / Math.max(current.width, current.height);
              totalDistanceMoved += distanceMovedPercent;
              numPointsCompared++;
            }
            const averageDistanceMoved = totalDistanceMoved / numPointsCompared;
            if (averageDistanceMoved < threshold) {
              continue;
            } else {
              return true;
            }
          }
        }
      }
      return false;
    }
    function groupMatricesById(matrices) {
      const matrixById = {};
      const matrixTags = {};

      matrices.forEach(matrix => {
        const id = matrix.id;
        const tag = matrix.tag;
        if (!matrixById[id]) {
          matrixById[id] = [];
        }
        matrixTags[tag] = id;
        matrixById[id].push(matrix);
      });

      return matrixById
    }
    function getAllMatricesThatMoved(monitorConfig,matrices){
        const monitorDetails = monitorConfig.details
        const imgWidth = parseInt(monitorDetails.detector_scale_x_object) || 1280
        const imgHeight = parseInt(monitorDetails.detector_scale_y_object) || 720
        const objectMovePercent = parseInt(monitorDetails.detector_object_move_percent) || 5
        const groupKey = monitorConfig.ke
        const monitorId = monitorConfig.mid
        const trackerId = `${groupKey}${monitorId}`
        const theTracker = objectTrackers[trackerId]
        const lastPositions = theTracker.lastPositions
        const sortedById = groupMatricesById([...lastPositions,...matrices])
        const movedMatrices = []
        for (const objectId in sortedById) {
            const sortedList = sortedById[objectId]
            if(sortedList[1]){
                const matrixHasMoved = objectHasMoved(sortedList,{
                    threshold: objectMovePercent,
                    imgWidth: imgWidth,
                    imgHeight: imgHeight,
                });
                if(matrixHasMoved){
                    movedMatrices.push(sortedList[1])
                }
            }
        }
        return movedMatrices
    }
    function isMatrixNearAnother(firstMatrix, secondMatrix, imgWidth, imgHeight) {
        // Calculate the distance between two rectangles
        function rectDistance(rect1, rect2) {
            const xDist = Math.max(rect1.x - (rect2.x + rect2.width), rect2.x - (rect1.x + rect1.width), 0);
            const yDist = Math.max(rect1.y - (rect2.y + rect2.height), rect2.y - (rect1.y + rect1.height), 0);
            return Math.sqrt(xDist * xDist + yDist * yDist);
        }

        // Calculate the overlap area
        function overlapArea(rect1, rect2) {
            const xOverlap = Math.max(0, Math.min(rect1.x + rect1.width, rect2.x + rect2.width) - Math.max(rect1.x, rect2.x));
            const yOverlap = Math.max(0, Math.min(rect1.y + rect1.height, rect2.y + rect2.height) - Math.max(rect1.y, rect2.y));
            return xOverlap * yOverlap;
        }

        const pxDistance = rectDistance(firstMatrix, secondMatrix);
        const overlapAreaValue = overlapArea(firstMatrix, secondMatrix);
        const totalArea = firstMatrix.width * firstMatrix.height + secondMatrix.width * secondMatrix.height - overlapAreaValue;
        const overlapPercent = totalArea > 0 ? (overlapAreaValue / totalArea) * 100 : 0;
        const distancePercent = Math.sqrt(Math.pow(pxDistance / imgWidth, 2) + Math.pow(pxDistance / imgHeight, 2)) * 100;
        const isOverlap = overlapAreaValue > 0;
        const nearThreshold = 50;
        const isNear = pxDistance < nearThreshold;

        return { pxDistance, overlapPercent, distancePercent, isOverlap, isNear };
    }
    function combinePeopleAndMiscObjects(matrices, imgWidth, imgHeight) {
        const peopleMatrices = [];
        const otherMatrices = [];

        // Separate the matrices into two arrays
        matrices.forEach(matrix => {
            if (peopleTags.has(matrix.tag)) {
                peopleMatrices.push({...matrix, nearBy: []});
            } else {
                otherMatrices.push({...matrix, associatedPeople: [], color: 'green'});  // Initialize associatedPeople array
            }
        });

        // Compare each people matrix with each other matrix
        peopleMatrices.forEach(personMatrix => {
            otherMatrices.forEach(otherMatrix => {
                const comparisonResult = isMatrixNearAnother(personMatrix, otherMatrix, imgWidth, imgHeight);
                // console.error(`comparisonResult (${comparisonResult.overlapPercent}%) : ${otherMatrix.tag} (${otherMatrix.id}) is on ${personMatrix.tag} (${personMatrix.id}) about ${comparisonResult.overlapPercent}%`,comparisonResult)
                if (comparisonResult.overlapPercent > 35) {
                    // Attach the person's ID to the otherMatrix

                    // Combine comparison result with the properties of the other matrix
                    personMatrix.nearBy.push({
                        ...otherMatrix,
                        ...comparisonResult,
                    });
                    otherMatrix.associatedPeople.push(personMatrix.id);
                    otherMatrix.color = 'yellow'
                }
            });
        });

        return [...peopleMatrices, ...otherMatrices];
    }
    function addToTrackedHistory(theEvent){
        const groupKey = theEvent.ke
        const monitorId = theEvent.id
        const matrices = theEvent.details.matrices
        matrices.forEach((matrix) => {
            const trackerId = `${groupKey}${monitorId}${matrix.id}${matrix.tag}`;
            if(!trackedMatrices[trackerId])trackedMatrices[trackerId] = new Set();
            trackedMatrices[trackerId].add(matrix);
            if (trackedMatrices[trackerId].length > 30) {
                shiftSet(trackedMatrices[trackerId]);
            }
        });
    }
    function filterOutLessSeenNearBy(theEvent){
        const groupKey = theEvent.ke;
        const monitorId = theEvent.id;
        const matrices = theEvent.details.matrices;
        matrices.forEach(matrix => {
            if(!matrix.nearBy)matrix.nearBy = [];
            const trackerId = `${groupKey}${monitorId}${matrix.id}${matrix.tag}`;
            const trackedSet = trackedMatrices[trackerId];
            if (trackedSet && trackedSet.size > 0) {
                const frequencyMap = new Map();
                trackedSet.forEach(trackedMatrix => {
                    trackedMatrix.nearBy.forEach(nearByMatrix => {
                        const key = JSON.stringify(nearByMatrix); // Assuming 'nearByMatrix' is an object
                        frequencyMap.set(key, (frequencyMap.get(key) || 0) + 1);
                    });
                });
                matrix.nearBy = matrix.nearBy.filter(nearByMatrix => {
                    const key = JSON.stringify(nearByMatrix);
                    return frequencyMap.get(key) / trackedSet.size >= 0.8;
                });
            }
        });
        return theEvent;
    }
    function separateMatricesByTag(matrices) {
        const groupedByTag = matrices.reduce((acc, matrix) => {
            if (!acc[matrix.tag]) {
                acc[matrix.tag] = [];
            }
            acc[matrix.tag].push(matrix);
            return acc;
        }, {});
        return Object.values(groupedByTag);
    }
    function trackMatrices(theEvent){
        const groupKey = theEvent.ke;
        const monitorId = theEvent.id;
        const eventDetails = theEvent.details;
        const trackedObjects = []
        separateMatricesByTag(eventDetails.matrices).forEach((matrices) => {
            if(!matrices[0])return;
            const matrixTag = matrices[0].tag
            const trackerId = `${groupKey}${monitorId}${matrixTag}`;
            trackObjectWithTimeout(trackerId,matrices);
            trackedObjects.push(...getTracked(trackerId));
            setLastTracked(trackerId, trackedObjects);
        });
        return trackedObjects;
    }
    function markMatricesWithRedFlagTags(theEvent, redFlags) {
        const groupKey = theEvent.ke;
        const monitorId = theEvent.id;
        const matrices = theEvent.details.matrices;

        matrices.forEach((matrix) => {
            const trackerId = `${groupKey}${monitorId}${matrix.id}${matrix.tag}`;
            const trackedMatrixSet = trackedMatrices[trackerId];

            if (trackedMatrixSet) {
                let redFlagCount = 0; // Counter for matrices with red flag tags

                trackedMatrixSet.forEach((trackedMatrix) => {
                    // Check if any nearBy matrix has a tag that matches the red flags
                    if (trackedMatrix.nearBy && trackedMatrix.nearBy.some(nearByMatrix => redFlags.includes(nearByMatrix.tag))) {
                        redFlagCount++; // Increment counter for each match
                    }
                });

                // Calculate if the red flag count is at least 30% of the trackedMatrixSet
                if (redFlagCount / trackedMatrixSet.size >= 0.3) {
                    matrix.suspect = true; // Mark the matrix as suspect
                }
            }
        });
    }
    function setMissingRecentlyMatrices(theEvent, redFlags) {
        const groupKey = theEvent.ke;
        const monitorId = theEvent.id;
        let eventMatrices = theEvent.details.matrices.map(matrix => {
            return { ...matrix, missingRecently: [] }
        });
        let nearByFrequencies = {};

        // Calculate frequencies of nearBy tags across all trackedMatrixSets
        eventMatrices.forEach((matrix) => {
            if(!matrix.suspect)return;
            const trackerId = `${groupKey}${monitorId}${matrix.id}${matrix.tag}`;
            const trackedMatrixSet = trackedMatrices[trackerId];

            if (trackedMatrixSet) {
                trackedMatrixSet.forEach((trackedMatrix) => {
                    if (trackedMatrix.nearBy) {
                        trackedMatrix.nearBy.forEach((nearByMatrix) => {
                            nearByFrequencies[nearByMatrix.tag] = (nearByFrequencies[nearByMatrix.tag] || 0) + 1;
                        });
                    }
                });
            }
        });

        // Determine which nearBy items are seen in at least 30% of trackedMatrixSet
        let frequentItems = Object.keys(nearByFrequencies).filter(tag => nearByFrequencies[tag] / Object.keys(trackedMatrices).length >= 0.3);

        // Update eventMatrices with missingRecently data
        eventMatrices = eventMatrices.map(matrix => {
            if(!matrix.suspect)return matrix;
            let missingTags = frequentItems.filter(item => !!item && !(matrix.nearBy && matrix.nearBy.some(nearByMatrix => nearByMatrix.tag === item)));
            if (missingTags.length > 0) {
                matrix.missingRecently = missingTags;
            }
            return matrix;
        });

        return eventMatrices;
    }

    function checkMissingItemsNearRedFlagContainers(theEvent, redFlagContainers) {
        const groupKey = theEvent.ke;
        const monitorId = theEvent.id;
        let eventMatrices = theEvent.details.matrices;

        eventMatrices.forEach(matrix => {
            if(!matrix.suspect)return;
            // Initialize an array to store red flag containers that are near missing items, if not already present
            if (!matrix.nearRedFlagContainers) {
                matrix.nearRedFlagContainers = [];
            }

            // Proceed if the matrix has missingRecently items
            if (matrix.missingRecently && matrix.missingRecently.length > 0) {
                const trackerId = `${groupKey}${monitorId}${matrix.id}${matrix.tag}`;
                const trackedMatrixSet = trackedMatrices[trackerId];

                if (trackedMatrixSet) {
                    trackedMatrixSet.forEach(trackedMatrix => {
                        // Check if this trackedMatrix is a redFlagContainer
                        if (redFlagContainers.includes(trackedMatrix.tag)) {
                            // Now, check each missingRecently item
                            matrix.missingRecently.forEach(missingItemTag => {
                                console.log(`missingItemTag`,missingItemTag)
                                // Find the original matrix for the missingItemTag to perform proximity check
                                const missingItemMatrix = Array.from(trackedMatrixSet).find(m => m.tag === missingItemTag);
                                if (missingItemMatrix) {
                                    // Check if missingItemMatrix is near the redFlagContainer
                                    const isNear = isMatrixNearAnother(missingItemMatrix, trackedMatrix, theEvent.imgWidth, theEvent.imgHeight);
                                    if (isNear) {
                                        // If near, add redFlagContainer information to the matrix
                                        matrix.nearRedFlagContainers.push({
                                            tag: trackedMatrix.tag,
                                            id: trackedMatrix.id,
                                            missingItemTag: missingItemTag
                                        });
                                    }
                                }
                            });
                        }
                    });
                }
            }
        });

        return eventMatrices;
    }

    return {
        trackObjectWithTimeout,
        resetObjectTracker,
        trackObject,
        getTracked,
        setLastTracked,
        getAllMatricesThatMoved,
        isMatrixNearAnother,
        combinePeopleAndMiscObjects,
        filterOutLessSeenNearBy,
        separateMatricesByTag,
        addToTrackedHistory,
        trackMatrices,
        markMatricesWithRedFlagTags,
        setMissingRecentlyMatrices,
        checkMissingItemsNearRedFlagContainers,
        peopleTags,
    }
}
