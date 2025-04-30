// Храним глобальные данные
const appState = {
    originalJson: null,      // Исходный JSON файл
    bakedJson: null,         // Запеченный JSON файл
    animations: [],          // Список анимаций
    processingState: {},     // Состояние обработки для каждой анимации
    downloadReady: false     // Готовность для скачивания
};

// Элементы интерфейса
const elements = {
    status: document.getElementById("status"),
    bakeButton: document.getElementById("bakeButton"),
    jsonFile: document.getElementById("jsonFile"),
    animationList: document.getElementById("animationList"),
    resultSection: document.getElementById("result-section"),
    downloadBtn: document.getElementById("download-btn")
};

// Функция для чтения файла как текста
async function readFileAsText(file) {
    console.log(`Чтение файла: ${file.name}`);
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            console.log(`Файл ${file.name} успешно прочитан`);
            resolve(reader.result);
        };
        reader.onerror = () => {
            console.error(`Ошибка чтения файла ${file.name}:`, reader.error);
            reject(new Error(`Не удалось прочитать ${file.name}: ${reader.error.message}`));
        };
        reader.readAsText(file);
    });
}

// Собственная реализация AttachmentLoader для Spine 4.1
class DummyAttachmentLoader {
    constructor() {
        // Constructor needed for Spine 4.1
        this.availableAttachments = new Set(); // Хранение доступных аттачментов
    }

    // Добавить аттачмент в список доступных
    addAvailableAttachment(slotName, attachmentName) {
        this.availableAttachments.add(`${slotName}:${attachmentName}`);
    }

    // Проверить, доступен ли аттачмент
    isAttachmentAvailable(slotName, attachmentName) {
        return this.availableAttachments.has(`${slotName}:${attachmentName}`);
    }

    newRegionAttachment(skin, name, path) {
        console.log(`Создание RegionAttachment: ${name}, path: ${path}`);
        const attachment = new spine.RegionAttachment(name);
        // Минимальная инициализация
        attachment.width = 100;
        attachment.height = 100;
        attachment.x = 0;
        attachment.y = 0;
        attachment.rotation = 0;
        attachment.scaleX = 1;
        attachment.scaleY = 1;
        return attachment;
    }

    newMeshAttachment(skin, name, path) {
        console.log(`Создание MeshAttachment: ${name}, path: ${path}`);
        const attachment = new spine.MeshAttachment(name);
        // Минимальная инициализация для Spine 4.1
        attachment.width = 100;
        attachment.height = 100;
        return attachment;
    }

    newBoundingBoxAttachment(skin, name) {
        console.log(`Создание BoundingBoxAttachment: ${name}`);
        return new spine.BoundingBoxAttachment(name);
    }

    newPathAttachment(skin, name) {
        console.log(`Создание PathAttachment: ${name}`);
        return new spine.PathAttachment(name);
    }

    newPointAttachment(skin, name) {
        console.log(`Создание PointAttachment: ${name}`);
        return new spine.PointAttachment(name);
    }

    newClippingAttachment(skin, name) {
        console.log(`Создание ClippingAttachment: ${name}`);
        return new spine.ClippingAttachment(name);
    }
}

// Функция для получения ключевых кадров из анимации
function getAnimationKeyframes(animationData) {
    const timepoints = new Set();
    
    // Добавляем время 0 как начальный кадр
    timepoints.add(0);
    
    // Извлекаем временные метки из костей
    if (animationData.bones) {
        for (const boneName in animationData.bones) {
            const bone = animationData.bones[boneName];
            
            for (const propertyName in bone) {
                const property = bone[propertyName];
                
                for (const keyframe of property) {
                    if (keyframe.time !== undefined) {
                        timepoints.add(keyframe.time);
                    }
                }
            }
        }
    }
    
    // Извлекаем временные метки из слотов
    if (animationData.slots) {
        for (const slotName in animationData.slots) {
            const slot = animationData.slots[slotName];
            
            for (const propertyName in slot) {
                const property = slot[propertyName];
                
                for (const keyframe of property) {
                    if (keyframe.time !== undefined) {
                        timepoints.add(keyframe.time);
                    }
                }
            }
        }
    }
    
    // Извлекаем временные метки из drawOrder
    if (animationData.drawOrder) {
        for (const frame of animationData.drawOrder) {
            if (frame.time !== undefined) {
                timepoints.add(frame.time);
            }
        }
    }
    
    // Извлекаем временные метки из деформаций
    if (animationData.deform) {
        for (const slotName in animationData.deform) {
            const slotDeforms = animationData.deform[slotName];
            for (const attachmentName in slotDeforms) {
                const frames = slotDeforms[attachmentName];
                for (const frame of frames) {
                    if (frame.time !== undefined) {
                        timepoints.add(frame.time);
                    }
                }
            }
        }
    }
    
    // Сортируем временные метки
    return Array.from(timepoints).sort((a, b) => a - b);
}

// Округление числа до целого
function roundToInteger(value) {
    return Math.round(value);
}

// Генерация случайного хеша для скелета
function generateRandomHash() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Функция для обновления статуса
function updateStatus(message, type = 'info') {
    const statusElem = elements.status;
    statusElem.textContent = message;
    statusElem.className = '';
    statusElem.classList.add(type);
    
    // Добавляем/удаляем спиннер
    const existingSpinner = document.getElementById('spinner');
    if (type === 'working') {
        if (!existingSpinner) {
            const spinner = document.createElement('div');
            spinner.id = 'spinner';
            statusElem.insertBefore(spinner, statusElem.firstChild);
        } else {
            existingSpinner.style.display = 'block';
        }
    } else {
        if (existingSpinner) existingSpinner.style.display = 'none';
    }
}

// Функция для обновления статуса анимации
function updateAnimationStatus(animationName, status, message = '') {
    const animList = elements.animationList;
    if (animList.style.display === 'none' || animList.style.display === '') {
        animList.style.display = 'block';
    }
    
    let animItem = document.getElementById(`anim-${animationName}`);
    
    if (!animItem) {
        animItem = document.createElement('div');
        animItem.id = `anim-${animationName}`;
        animItem.className = 'animation-item';
        animItem.innerHTML = `
            <div class="animation-name">${animationName}</div>
            <div class="animation-status" id="status-${animationName}">Ожидание...</div>
        `;
        animList.appendChild(animItem);
    }
    
    const statusElem = document.getElementById(`status-${animationName}`);
    statusElem.textContent = message || status;
    statusElem.className = 'animation-status';
    
    if (status === 'success') {
        statusElem.classList.add('success');
    } else if (status === 'error') {
        statusElem.classList.add('error');
    } else if (status === 'processing') {
        statusElem.classList.add('processing');
    }
}

// Функция для сохранения готового JSON
function saveJsonFile() {
    if (!appState.bakedJson) {
        updateStatus('Нет данных для сохранения', 'error');
        return;
    }
    
    const fileName = elements.jsonFile.files[0]?.name.replace('.json', '') || 'animation';
    const jsonBlob = new Blob([JSON.stringify(appState.bakedJson)], { type: "application/json" });
    const url = URL.createObjectURL(jsonBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}_baked.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    updateStatus('Файл успешно сохранен!', 'success');
}

// Функция для сбора всех существующих аттачментов для всех слотов
function collectAllAttachments() {
    const attachmentMap = new Map();
    
    // Собираем аттачменты из всех скинов
    if (appState.originalJson.skins) {
        for (const skin of appState.originalJson.skins) {
            for (const slotName in skin.attachments) {
                if (!attachmentMap.has(slotName)) {
                    attachmentMap.set(slotName, new Set());
                }
                
                const slotAttachments = attachmentMap.get(slotName);
                
                for (const attachmentName in skin.attachments[slotName]) {
                    slotAttachments.add(attachmentName);
                }
            }
        }
    }
    
    return attachmentMap;
}

// Функция для извлечения вершин из анимации
async function extractVertices(animationName) {
    try {
        updateAnimationStatus(animationName, 'processing', 'Извлечение вершин...');
        
        // Получаем настройки FPS
        const fpsOption = document.querySelector('input[name="fpsOption"]:checked').value;
        let frameRate = 60; // По умолчанию высокий FPS
        let useKeyframesOnly = false;
        
        if (fpsOption === 'custom') {
            frameRate = parseInt(document.getElementById('customFps').value, 10);
            if (isNaN(frameRate) || frameRate < 1) {
                frameRate = 30; // Если введено некорректное значение
            }
        } else if (fpsOption === 'keyframes') {
            useKeyframesOnly = true;
        }
        
        let skeletonData;
        
        // Создаем наш собственный загрузчик вложений
        const attachmentLoader = new DummyAttachmentLoader();
        
        // Собираем все существующие аттачменты
        const allAttachments = collectAllAttachments();
        
        // Добавляем все аттачменты в загрузчик для проверки
        for (const [slotName, attachments] of allAttachments.entries()) {
            for (const attachmentName of attachments) {
                attachmentLoader.addAvailableAttachment(slotName, attachmentName);
            }
        }
        
        const skeletonJson = new spine.SkeletonJson(attachmentLoader);
        skeletonJson.scale = 1.0;
        
        try {
            // Клонируем JSON, чтобы не модифицировать оригинал
            const jsonClone = JSON.parse(JSON.stringify(appState.originalJson));
            
            // Проверяем и фиксим анимации аттачментов, которые могут быть недоступны
            fixAttachmentTimelines(jsonClone, attachmentLoader);
            
            skeletonData = skeletonJson.readSkeletonData(jsonClone);
        } catch (e) {
            console.error("Ошибка при чтении данных скелета:", e);
            throw new Error(`Ошибка при чтении данных скелета: ${e.message}`);
        }
        
        const skeleton = new spine.Skeleton(skeletonData);
        const stateData = new spine.AnimationStateData(skeleton.data);
        const state = new spine.AnimationState(stateData);

        const animation = skeletonData.findAnimation(animationName);
        if (!animation) {
            throw new Error(`Анимация "${animationName}" не найдена в JSON.`);
        }

        const duration = animation.duration;
        
        // Определяем временные точки для извлечения кадров
        let timepoints = [];
        
        if (useKeyframesOnly) {
            // Используем только ключевые кадры из анимации
            timepoints = getAnimationKeyframes(appState.originalJson.animations[animationName]);
        } else {
            // Используем равномерные временные шаги на основе FPS
            const timeStep = 1 / frameRate;
            for (let time = 0; time <= duration; time += timeStep) {
                timepoints.push(Number(time.toFixed(6))); // Убираем погрешности вычислений
            }
        }

        const output = [];
        
        // Обрабатываем кадры анимации
        for (const time of timepoints) {
            state.clearTracks();
            state.setAnimation(0, animationName, false);
            state.update(0);
            state.apply(skeleton);
            skeleton.updateWorldTransform();
            
            state.update(time);
            state.apply(skeleton);
            skeleton.updateWorldTransform();

            const frameData = {
                time: Number(time.toFixed(6)),
                meshes: {}
            };

            // Обрабатываем каждый слот скелета
            for (let i = 0; i < skeleton.slots.length; i++) {
                const slot = skeleton.slots[i];
                const attachment = slot.getAttachment();
                
                if (!attachment) continue;

                if (attachment instanceof spine.MeshAttachment) {
                    try {
                        // Для Spine 4.1 - получаем данные разными способами
                        let vertices = [];
                        
                        // Метод 1: использовать worldVerticesLength 
                        if (typeof attachment.computeWorldVertices === 'function') {
                            try {
                                // Определяем размер буфера для вершин
                                let vertexCount = 0;
                                if (attachment.worldVerticesLength !== undefined) {
                                    vertexCount = attachment.worldVerticesLength;
                                } else if (attachment.vertices !== undefined) {
                                    vertexCount = attachment.vertices.length;
                                } else if (attachment.uvs !== undefined) {
                                    vertexCount = attachment.uvs.length;
                                }
                                
                                if (vertexCount > 0) {
                                    const worldVertices = new Float32Array(vertexCount);
                                    
                                    // Пробуем разные сигнатуры computeWorldVertices
                                    if (attachment.computeWorldVertices.length >= 6) {
                                        // Новая сигнатура (Spine 3.8+)
                                        attachment.computeWorldVertices(slot, 0, vertexCount, worldVertices, 0, 2);
                                    } else {
                                        // Старая сигнатура
                                        attachment.computeWorldVertices(slot, worldVertices);
                                    }
                                    
                                    // Формируем массив вершин с округлением до целых чисел
                                    for (let j = 0; j < worldVertices.length; j += 2) {
                                        if (!isNaN(worldVertices[j]) && !isNaN(worldVertices[j+1])) {
                                            vertices.push({
                                                x: roundToInteger(worldVertices[j]),
                                                y: roundToInteger(worldVertices[j+1])
                                            });
                                        }
                                    }
                                }
                            } catch (e) {
                                console.warn(`Ошибка при вычислении вершин для ${attachment.name}: ${e.message}`);
                            }
                        }
                        
                        // Только если мы нашли вершины, добавляем их в результат
                        if (vertices.length > 0) {
                            const meshKey = `${slot.data.name}/${attachment.name}`;
                            frameData.meshes[meshKey] = vertices;
                        }
                    } catch (meshError) {
                        console.error(`Ошибка обработки меша ${slot.data.name}/${attachment?.name}:`, meshError);
                    }
                }
            }

            if (Object.keys(frameData.meshes).length > 0) {
                output.push(frameData);
            }
        }

        // Если данных нет, выдаем ошибку
        if (output.length === 0) {
            throw new Error("Не удалось извлечь вершины из анимации. Возможно, в ней нет mesh-вложений.");
        }

        updateAnimationStatus(animationName, 'processing', `Извлечено ${output.length} кадров`);
        
        return output;
    } catch (error) {
        updateAnimationStatus(animationName, 'error', `Ошибка: ${error.message}`);
        throw error;
    }
}

// Проверка и исправление анимаций аттачментов
function fixAttachmentTimelines(jsonData, attachmentLoader) {
    if (!jsonData.animations) return;
    
    for (const animationName in jsonData.animations) {
        const animation = jsonData.animations[animationName];
        
        // Исправляем анимации аттачментов в слотах
        if (animation.slots) {
            for (const slotName in animation.slots) {
                const slot = animation.slots[slotName];
                
                // Проверяем и исправляем таймлайны аттачментов
                if (slot.attachment) {
                    const invalidFrames = [];
                    
                    for (let i = 0; i < slot.attachment.length; i++) {
                        const frame = slot.attachment[i];
                        
                        // Проверяем, существует ли указанный аттачмент
                        if (frame.name && !attachmentLoader.isAttachmentAvailable(slotName, frame.name)) {
                            console.warn(`Найден невалидный аттачмент в анимации ${animationName}, слот ${slotName}: ${frame.name}`);
                            invalidFrames.push(i);
                        }
                    }
                    
                    // Удаляем невалидные фреймы (с конца к началу, чтобы индексы не сбились)
                    for (let i = invalidFrames.length - 1; i >= 0; i--) {
                        const frameIndex = invalidFrames[i];
                        slot.attachment.splice(frameIndex, 1);
                    }
                    
                    // Если все фреймы удалены, удаляем весь таймлайн
                    if (slot.attachment.length === 0) {
                        delete slot.attachment;
                    }
                }
            }
        }
    }
}

// Получение списка всех слотов с мешами, включая выключенные
function getMeshSlots() {
    const meshSlots = new Map();
    const slotVisibilityState = new Map();
    
    // Собираем информацию о мешах
    if (appState.originalJson.skins) {
        for (const skin of appState.originalJson.skins) {
            for (const slotName in skin.attachments) {
                for (const attachmentName in skin.attachments[slotName]) {
                    const attachment = skin.attachments[slotName][attachmentName];
                    if (attachment.type === "mesh") {
                        meshSlots.set(slotName, attachmentName);
                    }
                }
            }
        }
    }
    
    // Собираем информацию о видимости слотов
    if (appState.originalJson.slots) {
        for (const slot of appState.originalJson.slots) {
            // Проверяем, есть ли у слота свойство visible
            if (slot.name && meshSlots.has(slot.name)) {
                // Если visible явно установлен как false, запоминаем это
                if (slot.hasOwnProperty('visible') && slot.visible === false) {
                    slotVisibilityState.set(slot.name, false);
                } else {
                    // По умолчанию все слоты видимы
                    slotVisibilityState.set(slot.name, true);
                }
            }
        }
    }
    
    return {
        meshSlots,
        slotVisibilityState
    };
}

// Инициализация базовой структуры запеченного JSON
function initializeBakedJson(extractedVertices) {
    appState.bakedJson = {
        skeleton: {
            hash: appState.originalJson.skeleton?.hash || generateRandomHash(),
            spine: appState.originalJson.skeleton?.spine || "4.1.24",
        },
        bones: [
            { name: "root" }
        ],
        slots: [],
        skins: [{
            name: "default",
            attachments: {}
        }],
        animations: {}
    };
    
    // Собираем информацию о мешах и слотах
    const { meshSlots, slotVisibilityState } = getMeshSlots();
    const meshAttachments = new Map();
    const slotDataMap = new Map();
    
    // Собираем информацию о слотах
    if (appState.originalJson.slots) {
        for (const slot of appState.originalJson.slots) {
            slotDataMap.set(slot.name, {...slot});
        }
    }
    
    // Собираем информацию о мешах
    if (appState.originalJson.skins) {
        for (const skin of appState.originalJson.skins) {
            for (const slotName in skin.attachments) {
                for (const attachmentName in skin.attachments[slotName]) {
                    const attachment = skin.attachments[slotName][attachmentName];
                    if (attachment.type === "mesh") {
                        const meshKey = `${slotName}/${attachmentName}`;
                        meshAttachments.set(meshKey, {...attachment});
                    }
                }
            }
        }
    }
    
    // Добавляем слоты в том же порядке, что и в оригинальном файле
    if (appState.originalJson.slots) {
        // Создаем список слотов с мешами
        const meshSlotKeys = Array.from(meshSlots.keys());
        
        // Добавляем слоты в том же порядке, что и в исходном файле
        for (const originalSlot of appState.originalJson.slots) {
            const slotName = originalSlot.name;
            // Добавляем только слоты с мешами
            if (meshSlotKeys.includes(slotName)) {
                const attachmentName = meshSlots.get(slotName);
                const newSlot = {
                    name: slotName,
                    bone: "root",
                    attachment: attachmentName
                };
                
                // Копируем другие важные свойства слота
                if (originalSlot.color) newSlot.color = originalSlot.color;
                if (originalSlot.blend) newSlot.blend = originalSlot.blend;
                
                // Добавляем свойство visible для отключенных слотов
                if (slotVisibilityState.has(slotName) && slotVisibilityState.get(slotName) === false) {
                    newSlot.visible = false;
                }
                
                appState.bakedJson.slots.push(newSlot);
            }
        }
    }
    
    // Добавляем меши в скин
    for (const [meshKey, meshData] of meshAttachments.entries()) {
        const [slotName, attachmentName] = meshKey.split('/');
        
        if (!appState.bakedJson.skins[0].attachments[slotName]) {
            appState.bakedJson.skins[0].attachments[slotName] = {};
        }
        
        // Получаем первый кадр для использования как базовый
        const firstFrameVertices = extractedVertices[0]?.meshes[meshKey];
        
        if (firstFrameVertices) {
            // Создаем очищенную версию меша
            const cleanMesh = {
                type: "mesh",
                uvs: meshData.uvs,
                triangles: meshData.triangles,
                hull: meshData.hull
            };
            
            // Преобразуем вершины в плоский массив целых чисел
            const flatVertices = [];
            for (const vertex of firstFrameVertices) {
                flatVertices.push(roundToInteger(vertex.x));
                flatVertices.push(roundToInteger(vertex.y));
            }
            
            cleanMesh.vertices = flatVertices;
            
            // Добавляем меш в скин
            appState.bakedJson.skins[0].attachments[slotName][attachmentName] = cleanMesh;
        }
    }
    
    // Добавляем все аттачменты, которые используются в анимациях, но не имеют мешей
    ensureAllAttachmentsExist();
}

// Обеспечиваем наличие всех аттачментов, используемых в анимациях
function ensureAllAttachmentsExist() {
    if (!appState.originalJson.animations || !appState.bakedJson) return;
    
    // Получаем список всех аттачментов из анимаций
    const animationAttachments = new Map();
    
    for (const animationName in appState.originalJson.animations) {
        const animation = appState.originalJson.animations[animationName];
        
        if (animation.slots) {
            for (const slotName in animation.slots) {
                const slot = animation.slots[slotName];
                
                if (slot.attachment) {
                    if (!animationAttachments.has(slotName)) {
                        animationAttachments.set(slotName, new Set());
                    }
                    
                    for (const frame of slot.attachment) {
                        if (frame.name) {
                            animationAttachments.get(slotName).add(frame.name);
                        }
                    }
                }
            }
        }
    }
    
    // Убеждаемся, что все эти аттачменты существуют в скине
    for (const [slotName, attachments] of animationAttachments.entries()) {
        for (const attachmentName of attachments) {
            // Создаем слот в скине, если его нет
            if (!appState.bakedJson.skins[0].attachments[slotName]) {
                appState.bakedJson.skins[0].attachments[slotName] = {};
            }
            
            // Проверяем, существует ли такой аттачмент в скине
            if (!appState.bakedJson.skins[0].attachments[slotName][attachmentName]) {
                // Ищем этот аттачмент в оригинальном JSON
                const foundAttachment = findAttachmentInOriginalJson(slotName, attachmentName);
                
                if (foundAttachment) {
                    // Копируем существующий аттачмент
                    appState.bakedJson.skins[0].attachments[slotName][attachmentName] = 
                        JSON.parse(JSON.stringify(foundAttachment));
                } else {
                    // Создаем пустой аттачмент
                    console.log(`Добавление пустого аттачмента для анимации: ${slotName}/${attachmentName}`);
                    appState.bakedJson.skins[0].attachments[slotName][attachmentName] = {};
                }
            }
        }
    }
}

// Функция поиска аттачмента в оригинальном JSON
function findAttachmentInOriginalJson(slotName, attachmentName) {
    if (!appState.originalJson.skins) return null;
    
    for (const skin of appState.originalJson.skins) {
        if (skin.attachments && skin.attachments[slotName] && skin.attachments[slotName][attachmentName]) {
            return skin.attachments[slotName][attachmentName];
        }
    }
    
    return null;
}

// Функция для запекания одной анимации
async function bakeAnimation(animationName) {
    try {
        updateAnimationStatus(animationName, 'processing', 'Запекание анимации...');
        
        // Шаг 1: Извлечение вершин
        const extractedVertices = await extractVertices(animationName);
        
        // Уже есть базовая структура?
        if (!appState.bakedJson) {
            initializeBakedJson(extractedVertices);
        }
        
        // Создаем анимацию в выходном JSON, если её ещё нет
        if (!appState.bakedJson.animations[animationName]) {
            appState.bakedJson.animations[animationName] = {
                slots: {},
                bones: { root: {} },
                attachments: {
                    "default": {}
                }
            };
            
            // Копируем анимацию слотов (с проверкой на неподдерживаемые аттачменты)
            if (appState.originalJson.animations[animationName].slots) {
                // Создаем глубокую копию
                const originalSlots = JSON.parse(JSON.stringify(appState.originalJson.animations[animationName].slots));
                
                // Проверяем каждый слот и его таймлайны
                for (const slotName in originalSlots) {
                    // Проверяем таймлайны аттачментов
                    if (originalSlots[slotName].attachment) {
                        const validFrames = [];
                        
                        for (const frame of originalSlots[slotName].attachment) {
                            // Проверяем, что аттачмент существует в нашем запеченном JSON
                            if (!frame.name || 
                                (appState.bakedJson.skins[0].attachments[slotName] && 
                                 appState.bakedJson.skins[0].attachments[slotName][frame.name])) {
                                validFrames.push(frame);
                            } else {
                                console.warn(`Пропуск аттачмента ${frame.name} в слоте ${slotName} - не найден в запеченном JSON`);
                            }
                        }
                        
                        // Обновляем таймлайн, если есть валидные фреймы
                        if (validFrames.length > 0) {
                            originalSlots[slotName].attachment = validFrames;
                        } else {
                            // Удаляем пустой таймлайн
                            delete originalSlots[slotName].attachment;
                        }
                    }
                    
                    // Если после проверки в слоте остались какие-то таймлайны,
                    // добавляем его в запеченную анимацию
                    if (Object.keys(originalSlots[slotName]).length > 0) {
                        appState.bakedJson.animations[animationName].slots[slotName] = originalSlots[slotName];
                    }
                }
            }
            
            // Копируем анимацию drawOrder
            copyDrawOrder(animationName);
        }
        
        // Запекаем деформации для каждого меша
        await bakeDeformations(animationName, extractedVertices);
        
        updateAnimationStatus(animationName, 'success', 'Запечено!');
        return true;
    } catch (error) {
        updateAnimationStatus(animationName, 'error', `Ошибка: ${error.message}`);
        console.error(`Ошибка при запекании анимации ${animationName}:`, error);
        return false;
    }
}

// Копирование анимации drawOrder
function copyDrawOrder(animationName) {
    if (appState.originalJson.animations[animationName].drawOrder) {
        appState.bakedJson.animations[animationName].drawOrder = JSON.parse(
            JSON.stringify(appState.originalJson.animations[animationName].drawOrder)
        );
    }
}

// Запекание деформаций на основе извлеченных вершин
async function bakeDeformations(animationName, extractedVertices) {
    // Собираем информацию о мешах
    const { meshSlots } = getMeshSlots();
    const meshAttachments = new Map();
    
    if (appState.originalJson.skins) {
        for (const skin of appState.originalJson.skins) {
            for (const slotName in skin.attachments) {
                for (const attachmentName in skin.attachments[slotName]) {
                    const attachment = skin.attachments[slotName][attachmentName];
                    if (attachment.type === "mesh") {
                        const meshKey = `${slotName}/${attachmentName}`;
                        meshAttachments.set(meshKey, attachment);
                    }
                }
            }
        }
    }
    
    // Для каждого меша создаем деформации
    for (const [meshKey, meshData] of meshAttachments.entries()) {
        const [slotName, attachmentName] = meshKey.split('/');
        
        // Создаем структуру для деформаций этого меша
        if (!appState.bakedJson.animations[animationName].attachments.default[slotName]) {
            appState.bakedJson.animations[animationName].attachments.default[slotName] = {};
        }
        
        // Пропускаем, если нет данных для этого меша
        if (!extractedVertices[0]?.meshes[meshKey]) continue;
        
        appState.bakedJson.animations[animationName].attachments.default[slotName][attachmentName] = {
            deform: []
        };
        
        // Получаем первый кадр для использования как базовый
        const firstFrameVertices = extractedVertices[0]?.meshes[meshKey];
        
        if (!firstFrameVertices) continue;
        
        // Для каждого кадра анимации
        for (let i = 0; i < extractedVertices.length; i++) {
            const frame = extractedVertices[i];
            const vertices = frame.meshes[meshKey];
            
            if (!vertices) continue;
            
            // Создаем кадр деформации
            const deformFrame = {};
            
            // Добавляем time если это не первый кадр
            if (i > 0) {
                deformFrame.time = frame.time;
            }
            
            // Если это первый кадр, оставляем пустую деформацию
            if (i === 0) {
                appState.bakedJson.animations[animationName].attachments.default[slotName][attachmentName].deform.push(deformFrame);
                continue;
            }
            
            // Вычисляем разницу между текущим и первым кадром
            const vertexDiffs = [];
            
            for (let j = 0; j < vertices.length; j++) {
                // Вычисляем разницу в целых числах
                const diffX = roundToInteger(vertices[j].x - firstFrameVertices[j].x);
                const diffY = roundToInteger(vertices[j].y - firstFrameVertices[j].y);
                
                // Добавляем значения
                vertexDiffs.push(diffX);
                vertexDiffs.push(diffY);
            }
            
            // Проверяем, есть ли ненулевые значения
            const hasNonZeroValues = vertexDiffs.some(value => value !== 0);
            
            // Добавляем vertices, только если есть ненулевые значения
            if (hasNonZeroValues) {
                deformFrame.vertices = vertexDiffs;
            }
            
            appState.bakedJson.animations[animationName].attachments.default[slotName][attachmentName].deform.push(deformFrame);
        }
    }
}

// Основная функция запекания всех анимаций
async function bakeAllAnimations() {
    try {
        if (!appState.originalJson) {
            throw new Error("Сначала выберите JSON файл");
        }
        
        if (appState.animations.length === 0) {
            throw new Error("В файле не найдено ни одной анимации");
        }
        
        updateStatus('Запекание анимаций...', 'working');
        elements.bakeButton.disabled = true;
        
        // Сбрасываем состояние
        appState.bakedJson = null;
        appState.processingState = {};
        
        const results = [];
        
        // Запекаем каждую анимацию последовательно
        for (const animationName of appState.animations) {
            try {
                const success = await bakeAnimation(animationName);
                results.push({ name: animationName, success });
                
                appState.processingState[animationName] = success ? 'success' : 'error';
            } catch (error) {
                console.error(`Ошибка при запекании анимации ${animationName}:`, error);
                results.push({ name: animationName, success: false });
                appState.processingState[animationName] = 'error';
            }
        }
        
        // Проверяем результаты
        const successCount = results.filter(r => r.success).length;
        
        if (successCount === 0) {
            updateStatus('Не удалось запечь ни одной анимации', 'error');
        } else if (successCount < results.length) {
            updateStatus(`Запечено ${successCount} из ${results.length} анимаций`, 'success');
            showDownloadButton();
        } else {
            updateStatus('Все анимации успешно запечены!', 'success');
            showDownloadButton();
        }
    } catch (error) {
        updateStatus(`Ошибка: ${error.message}`, 'error');
        console.error("Ошибка при запекании анимаций:", error);
    } finally {
        elements.bakeButton.disabled = false;
    }
}

// Функция для отображения кнопки скачивания
function showDownloadButton() {
    elements.resultSection.style.display = 'block';
}

// Обработка изменения файла
async function handleFileChange() {
    try {
        const file = elements.jsonFile.files[0];
        if (!file) {
            updateStatus('Выберите JSON файл', 'info');
            return;
        }
        
        updateStatus('Чтение файла...', 'working');
        
        // Сбрасываем предыдущее состояние
        appState.originalJson = null;
        appState.bakedJson = null;
        appState.animations = [];
        elements.animationList.innerHTML = '';
        elements.animationList.style.display = 'none';
        elements.resultSection.style.display = 'none';
        
        const jsonText = await readFileAsText(file);
        const jsonData = JSON.parse(jsonText);
        
        appState.originalJson = jsonData;
        
        // Получаем список анимаций
        if (jsonData.animations) {
            appState.animations = Object.keys(jsonData.animations);
            
            if (appState.animations.length > 0) {
                updateStatus(`Найдено ${appState.animations.length} анимаций`, 'success');
                elements.bakeButton.disabled = false;
            } else {
                updateStatus('В файле не найдено ни одной анимации', 'error');
                elements.bakeButton.disabled = true;
            }
        } else {
            updateStatus('В файле не найдены анимации', 'error');
            elements.bakeButton.disabled = true;
        }
    } catch (error) {
        updateStatus(`Ошибка: ${error.message}`, 'error');
        console.error("Ошибка при чтении файла:", error);
        elements.bakeButton.disabled = true;
    }
}

// Привязка обработчиков событий
function setupEventListeners() {
    // Обработчик изменения файла
    elements.jsonFile.addEventListener('change', handleFileChange);
    
    // Обработчик кнопки запекания
    elements.bakeButton.addEventListener('click', bakeAllAnimations);
    
    // Обработчик кнопки скачивания
    elements.downloadBtn.addEventListener('click', saveJsonFile);
    
    // Проверка наличия библиотеки Spine
    if (typeof spine === 'undefined') {
        updateStatus('Ошибка: библиотека Spine не найдена', 'error');
        elements.bakeButton.disabled = true;
    } else {
        updateStatus('Выберите JSON файл для начала работы', 'info');
        elements.bakeButton.disabled = true;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', setupEventListeners);
