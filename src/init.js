import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {Car} from "./car.js";
import {OrbitControls} from "three/addons";
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';


document.addEventListener('DOMContentLoaded', init);

function init() {
    // Получаем элемент canvas из DOM по классу 'webgl'
    const canvas = document.querySelector('canvas.webgl');

    // Создаем новую трехмерную сцену в THREE.js
    const scene = new THREE.Scene();

    // Настраиваем физический мир в CANNON.js с указанием гравитации, равной ускорению свободного падения
    const world = new CANNON.World({
        gravity: new CANNON.Vec3(0, -9.82, 0) // m/s², где -9.82 — ускорение свободного падения
    });

    // Используем более продвинутую структуру данных для распознавания столкновений, что полезно для большого количества объектов
    world.broadphase = new CANNON.SAPBroadphase(world);

    /**
     * Настройки размеров для камеры
     */
    const sizes = {
        width: window.innerWidth,  // Ширина окна браузера
        height: window.innerHeight // Высота окна браузера
    };

    /**
     * Основная камера
     */
    const camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 0.1, 10000);
    camera.position.set(0, 4, 6); // Устанавливаем позицию камеры
    scene.add(camera); // Добавляем камеру в сцену

    /**
     * Chase Camera
     * Этот объект используется для создания эффекта погони за другим объектом, например, за автомобилем
     */
    const chaseCam = new THREE.Object3D(); // Создаем новый пустой объект (Object3D)
    chaseCam.position.set(0, 0, 0); // Задаем начальную позицию chaseCam

    // Создаем pivot (точку поворота) для chaseCam
    const chaseCamPivot = new THREE.Object3D(); // Еще один пустой объект для создания точки, вокруг которой будет вращаться камера
    chaseCamPivot.position.set(0, 2, -4); // Задаем позицию точки поворота относительно chaseCam

    chaseCam.add(chaseCamPivot); // Добавляем точку поворота к chaseCam
    scene.add(chaseCam); // Добавляем chaseCam в сцену

    // В дальнейшем можно установить chaseCam для слежения за движущимся объектом,
    // и камера будет следовать за этим объектом, сохраняя относительное положение, заданное в chaseCamPivot.


    // Шейдеры
    var vertexShader = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
    var fragmentShader = `
  uniform vec3 topColor;
  uniform vec3 bottomColor;
  uniform float offset;
  uniform float exponent;
  varying vec3 vWorldPosition;
  void main() {
    float h = normalize(vWorldPosition + offset).y;
    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h , 0.0), exponent), 0.0)), 1.0);
  }
`;

    // Создание материала с шейдером
    let skyGeo = new THREE.SphereGeometry(1000, 32, 15); // можно заменить на BoxGeometry для кубического skybox
    let skyMat = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: {
            topColor: { value: new THREE.Color(0x0077FF) }, // цвет верха (синий)
            bottomColor: { value: new THREE.Color(0xFFFFFF) }, // цвет низа (бледно-голубой)
            offset: { value: 33 },
            exponent: { value: 0.6 }
        },
        side: THREE.BackSide
    });

    // Создание и добавление skybox на сцену
    let sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);



    // Создаем экземпляр автомобиля, передавая сцену и физический мир для интерактивности и физики
    const car = new Car(scene, world);
    car.init(); // Инициализируем автомобиль, подготавливая все необходимые объекты и параметры физики
    car.chassis.add(chaseCam);

    // Создаем материалы для тела автомобиля и поверхности земли
    const bodyMaterial = new CANNON.Material();
    const groundMaterial = new CANNON.Material();

    // Устанавливаем контактный материал между телом и землей, определяя трение и упругость
    const bodyGroundContactMaterial = new CANNON.ContactMaterial(
        bodyMaterial,   // Материал тела
        groundMaterial, // Материал земли
        {
            friction: 0.1,    // Коэффициент трения, маленькое значение позволяет скользить
            restitution: 0.1  // Коэффициент упругости, определяет "отскок" при ударе
        }
    );

    // Добавляем контактный материал в мир, чтобы он применялся при столкновении тела и земли
    world.addContactMaterial(bodyGroundContactMaterial);


    // Добавляем обработчик события 'resize' для окна браузера.
    // Этот обработчик будет вызываться каждый раз, когда размер окна браузера изменяется.
    window.addEventListener('resize', () => {
        // Обновляем размеры
        // Задаем новую ширину и высоту в соответствии с текущим размером окна браузера.
        sizes.width = window.innerWidth;
        sizes.height = window.innerHeight;

        // Обновляем камеру
        // Устанавливаем новое соотношение сторон для камеры на основе обновленных размеров.
        camera.aspect = sizes.width / sizes.height;
        // Обновляем матрицу проекции камеры, чтобы учесть изменения в соотношении сторон.
        camera.updateProjectionMatrix();

        // Обновляем рендерер
        // Устанавливаем размер рендерера, чтобы он соответствовал новым размерам окна.
        renderer.setSize(sizes.width, sizes.height);
        // Устанавливаем соотношение пикселей рендерера для обеспечения четкости изображения.
        // Используем минимальное значение между текущим соотношением пикселей устройства и 2,
        // чтобы избежать чрезмерно высокого расхода ресурсов на устройствах с очень высоким DPI.
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });





// Controls
    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true

    /**
     * Renderer
     */
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
    })
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(window.devicePixelRatio)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // Белый свет, максимальная интенсивность
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    //Создание геометрии плоскости
    const planeGeometry = new THREE.PlaneGeometry(128, 128);
    //Создание материала
    const planeMaterial = new THREE.MeshBasicMaterial({ color: 0x555555 }); // Цвет асфальта
    //Создание меша
    const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
    planeMesh.rotation.x = -Math.PI / 2; // Поворот, чтобы плоскость лежала горизонтально
    planeMesh.position.y = 0; // Позиция по Y, если нужно
    //Добавление плоскости на сцену
    scene.add(planeMesh);

    //Создание физической формы
    const groundShape = new CANNON.Plane();

    //Создание физического тела
    const groundBody = new CANNON.Body({
        mass: 0, // масса 0 делает тело статическим
        material: new CANNON.Material({ friction: 0.5 }) // Материал с трением
    });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Поворот, чтобы плоскость была горизонтальной

    //Добавление физического тела в мир CANNON
    world.addBody(groundBody);

    /**
     * Animate
     */
    const v = new THREE.Vector3() // Создаём новый трёхмерный вектор для хранения позиций
    const clock = new THREE.Clock()
    let delta

    // Определение функции tick, которая будет вызываться каждый кадр анимации
    function animate() {
        // Запланировать следующий вызов функции animate на следующем кадре анимации
        window.requestAnimationFrame(animate)

        delta = Math.min(clock.getDelta(), 0.1)
        world.step(delta)

        camera.lookAt(car.chassis.position) // Камера смотрит на позицию шасси автомобиля

        // Получаем мировую позицию объекта chaseCamPivot и записываем её в вектор v
        chaseCamPivot.getWorldPosition(v)
        // Устанавливаем минимальную высоту для камеры, чтобы она не опускалась ниже определённого уровня (y = 1)
        if (v.y < 1) {
            v.y = 1
        }
        // Плавно перемещаем позицию камеры к позиции v с помощью линейной интерполяции (leaping)
        camera.position.lerpVectors(camera.position, v, 0.05)

        // Отрисовываем сцену и камеру
        renderer.render(scene, camera)
    }

    // Начало цикла анимации
    animate()
}


