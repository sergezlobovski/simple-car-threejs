import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Car {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;

        this.car = {};
        this.car.helpChassisGeo = {};
        this.car.helpChassisMat = {};
        this.car.helpChassis = {};
        this.chassis = {};
        this.chassisModel = {};
        this.wheelModel = {};
        this.wheels = [];
        this.chassisDimension = {x: 1.96, y: 1, z: 4.47};
        this.chassisModelPos = {x: 0, y: -0.59, z: 0};
        this.wheelScale = {frontWheel: 0.67, hindWheel: 0.67};
        this.controlOptions = {
            maxSteerVal: 0.5,
            maxForce: 750,
            brakeForce: 36,
            slowDownCar: 19.6,
            primaryKeys: {
                forward: ['w', 'ц', 'arrowup'],
                backward: ['s', 'ы', 'arrowdown'],
                left: ['a', 'ф', 'arrowleft'],
                right: ['d', 'в', 'arrowright'],
                reset: ['r', 'к'],
                brake: [' ']
            }
        };

        this.loadModels();
    }
    init() {
        this.setChassis();
        this.setWheels();
        this.controls();
        this.update();
        this.guiRegisterer();
    }
    loadModels() {
        // Создаем геометрию и материал для "машины"
        const carGeometry = new THREE.BoxGeometry(1.2, 0.5, 3); // Геометрия кузова автомобиля (ширина, высота, длина)
        const carMaterial = new THREE.MeshBasicMaterial({ color: 0xFFA500 }); // Оранжевый материал для кузова

        // Создаем меш (сетку) для кузова автомобиля и добавляем его в сцену
        this.chassis = new THREE.Mesh(carGeometry, carMaterial);

        // Создание дополнительных визуальных элементов для кузова, если необходимо
        this.chassis.helpChassisGeo = new THREE.BoxGeometry(1, 1, 1); // Дополнительная геометрия для визуализации
        this.chassis.helpChassisMat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true }); // Красный материал в виде каркаса
        this.chassis.helpChassis = new THREE.Mesh(this.chassis.helpChassisGeo, this.chassis.helpChassisMat); // Создание меша для дополнительных элементов

        // Добавляем основной кузов и дополнительные элементы в сцену
        this.scene.add(this.chassis, this.chassis.helpChassis);

        // Инициализация массива для хранения колес
        this.wheels = [];
        const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 24); // Геометрия колеса (верхний радиус, нижний радиус, высота, количество сегментов)
        wheelGeometry.rotateZ(Math.PI / 180 * 90); // Поворот геометрии колеса для корректной ориентации
        const wheelMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Черный материал для колес

        // Цикл для создания и добавления всех четырех колес
        for(let i = 0; i < 4; i++) {
            this.wheels[i] = new THREE.Mesh(wheelGeometry, wheelMaterial); // Создание меша для каждого колеса

            // Инверсия масштаба для определенных колес (например, для отражения)
            if(i === 1 || i === 3) {
                this.wheels[i].scale.set(-1 * this.wheelScale.frontWheel, 1 * this.wheelScale.frontWheel, -1 * this.wheelScale.frontWheel);
            } else {
                this.wheels[i].scale.set(1 * this.wheelScale.frontWheel, 1 * this.wheelScale.frontWheel, 1 * this.wheelScale.frontWheel);
            }

            // Добавление каждого колеса в сцену
            this.scene.add(this.wheels[i]);
        }
    }

    setChassis() {
        // Создание формы шасси
        const chassisShape = new CANNON.Box(new CANNON.Vec3(
            this.chassisDimension.x * 0.5, // половина размера по оси X
            this.chassisDimension.y * 0.5, // половина размера по оси Y
            this.chassisDimension.z * 0.5  // половина размера по оси Z
        ));

        // Создание физического тела для шасси
        const chassisBody = new CANNON.Body({
            mass: 500, // масса шасси
            material: new CANNON.Material({friction: 0}) // материал с нулевым коэффициентом трения
        });
        chassisBody.addShape(chassisShape); // добавление формы к телу шасси

        // Настройка визуальной помощи для шасси
        this.chassis.helpChassis.visible = false; // скрытие вспомогательной визуализации
        this.chassis.helpChassis.scale.set(
            this.chassisDimension.x, // масштаб по оси X
            this.chassisDimension.y, // масштаб по оси Y
            this.chassisDimension.z  // масштаб по оси Z
        );

        // Создание и настройка автомобиля с использованием RaycastVehicle
        this.car = new CANNON.RaycastVehicle({
            chassisBody, // тело шасси
            indexRightAxis: 0, // индекс оси "право" (X)
            indexUpAxis: 1,    // индекс оси "верх" (Y)
            indexForwardAxis: 2 // индекс оси "вперед" (Z)
        });
        this.car.addToWorld(this.world); // добавление автомобиля в мир CANNON
    }

    setWheels() {
        // Опции для колес автомобиля
        const options = {
            radius: 0.34, // радиус колеса
            directionLocal: new CANNON.Vec3(0, -1, 0), // локальное направление
            suspensionStiffness: 55, // жесткость подвески
            suspensionRestLength: 1, // длина подвески в покое
            frictionSlip: 30, // коэффициент трения
            dampingRelaxation: 2.3, // демпфирование при расслаблении
            dampingCompression: 4.3, // демпфирование при сжатии
            maxSuspensionForce: 10000, // максимальная сила подвески
            rollInfluence:  0.01, // влияние крена
            axleLocal: new CANNON.Vec3(-1, 0, 0), // локальная ось колеса
            chassisConnectionPointLocal: new CANNON.Vec3(0, 0, 0), // точка подключения к шасси
            maxSuspensionTravel: 1, // максимальный ход подвески
            customSlidingRotationalSpeed: 30, // пользовательская скорость вращения при скольжении
        };

        // Установка точек соединения колес с шасси
        const setWheelChassisConnectionPoint = (index, position) => {
            this.car.wheelInfos[index].chassisConnectionPointLocal.copy(position);
        }

        // Инициализация информации о колесах
        this.car.wheelInfos = [];
        // Добавление колес к автомобилю
        this.car.addWheel(options);
        this.car.addWheel(options);
        this.car.addWheel(options);
        this.car.addWheel(options);

        // Настройка точек соединения колес с шасси
        setWheelChassisConnectionPoint(0, new CANNON.Vec3(0.75, 0.1, -1.32));
        setWheelChassisConnectionPoint(1, new CANNON.Vec3(-0.78, 0.1, -1.32));
        setWheelChassisConnectionPoint(2, new CANNON.Vec3(0.75, 0.1, 1.25));
        setWheelChassisConnectionPoint(3, new CANNON.Vec3(-0.78, 0.1, 1.25));

        // Создание визуальных и физических представлений колес
        this.car.wheelInfos.forEach(function(wheel, index){
            // Создание формы колеса
            const cylinderShape = new CANNON.Cylinder(wheel.radius, wheel.radius, wheel.radius / 2, 20);
            const wheelBody = new CANNON.Body({
                mass: 1, // масса колеса
                material: new CANNON.Material({friction: 0}), // материал колеса
            });

            // Установка ориентации колеса
            const quaternion = new CANNON.Quaternion().setFromEuler(-Math.PI / 2, 0, 0);
            wheelBody.addShape(cylinderShape, new CANNON.Vec3(), quaternion);

            // Добавление физического тела колеса и его визуализации
            this.wheels[index].wheelBody = wheelBody;
            this.wheels[index].helpWheelsGeo = new THREE.CylinderGeometry(wheel.radius, wheel.radius, wheel.radius / 2, 20);
            this.wheels[index].helpWheelsGeo.rotateZ(Math.PI / 2);
            this.wheels[index].helpWheelsMat = new THREE.MeshBasicMaterial({color: 0x00ffff, wireframe: true});
            this.wheels[index].helpWheels = new THREE.Mesh(this.wheels[index].helpWheelsGeo, this.wheels[index].helpWheelsMat);
            this.wheels[index].helpWheels.visible = false;
            this.scene.add(this.wheels[index].helpWheels);
        }.bind(this));
    }

    controls() {
        const keysPressed = [];

        // Обработчик нажатия клавиш
        window.addEventListener('keydown', (e) => {
            if(!keysPressed.includes(e.key.toLowerCase())) {
                keysPressed.push(e.key.toLowerCase());
            }
            hindMovement();
        });

        // Обработчик отпускания клавиш
        window.addEventListener('keyup', (e) => {
            keysPressed.splice(keysPressed.indexOf(e.key.toLowerCase()), 1);
            hindMovement();
        });

        const hindMovement = () => {
            const { primaryKeys } = this.controlOptions;

            // Проверка нажатия клавиши сброса
            if (primaryKeys.reset.some(key => keysPressed.includes(key))) resetCar();

            // Проверка нажатия клавиши тормоза
            if (!primaryKeys.brake.some(key => keysPressed.includes(key))) {
                this.car.setBrake(0, 0);
                this.car.setBrake(0, 1);
                this.car.setBrake(0, 2);
                this.car.setBrake(0, 3);

                // Проверка нажатия клавиш поворота влево и вправо
                if (primaryKeys.left.some(key => keysPressed.includes(key))) {
                    this.car.setSteeringValue(this.controlOptions.maxSteerVal * 1, 2);
                    this.car.setSteeringValue(this.controlOptions.maxSteerVal * 1, 3);
                }
                else if (primaryKeys.right.some(key => keysPressed.includes(key))) {
                    this.car.setSteeringValue(this.controlOptions.maxSteerVal * -1, 2);
                    this.car.setSteeringValue(this.controlOptions.maxSteerVal * -1, 3);
                }
                else stopSteer();

                // Проверка нажатия клавиш ускорения и движения назад
                if (primaryKeys.forward.some(key => keysPressed.includes(key))) {
                    this.car.applyEngineForce(this.controlOptions.maxForce * -1, 0);
                    this.car.applyEngineForce(this.controlOptions.maxForce * -1, 1);
                    this.car.applyEngineForce(this.controlOptions.maxForce * -1, 2);
                    this.car.applyEngineForce(this.controlOptions.maxForce * -1, 3);
                }
                else if (primaryKeys.backward.some(key => keysPressed.includes(key))) {
                    this.car.applyEngineForce(this.controlOptions.maxForce * 1, 0);
                    this.car.applyEngineForce(this.controlOptions.maxForce * 1, 1);
                    this.car.applyEngineForce(this.controlOptions.maxForce * 1, 2);
                    this.car.applyEngineForce(this.controlOptions.maxForce * 1, 3);
                }
                else stopCar();
            }
            else brake();
        }

        const resetCar = () => {
            this.car.chassisBody.position.set(0, 2, 0);
            this.car.chassisBody.quaternion.set(0, 0, 0, 1);
            this.car.chassisBody.angularVelocity.set(0, 0, 0);
            this.car.chassisBody.velocity.set(0, 0, 0);
        }

        const brake = () => {
            this.car.setBrake(this.controlOptions.brakeForce, 0);
            this.car.setBrake(this.controlOptions.brakeForce, 1);
            this.car.setBrake(this.controlOptions.brakeForce, 2);
            this.car.setBrake(this.controlOptions.brakeForce, 3);
        }

        const stopCar = () => {
            this.car.setBrake(this.controlOptions.slowDownCar, 0);
            this.car.setBrake(this.controlOptions.slowDownCar, 1);
            this.car.setBrake(this.controlOptions.slowDownCar, 2);
            this.car.setBrake(this.controlOptions.slowDownCar, 3);
        }

        const stopSteer = () => {
            this.car.setSteeringValue(0, 2);
            this.car.setSteeringValue(0, 3);
        }
    }

    guiRegisterer() {
        const controllableKeysArray = [' ', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'control', 'alt', 'shift', 'meta', 'tab']
        const vehicleOptions = {
            suspensionStiffness: 55,
            suspensionRestLength: 0.5,
            frictionSlip: 30,
            dampingRelaxation: 2.3,
            dampingCompression: 4.3,
            maxSuspensionForce: 10000,
            maxSuspensionTravel: 1,
            rollInfluence:  0.01,
        };
        const resetCar = () => {
            this.car.chassisBody.position.set(0, 4, 0);
            this.car.chassisBody.quaternion.set(0, 0, 0, 1);
            this.car.chassisBody.angularVelocity.set(0, 0, 0);
            this.car.chassisBody.velocity.set(0, 0, 0);
        }
        const stopCar = () => {
            this.car.setBrake(1000, 0);
            this.car.setBrake(1000, 1);
            setTimeout(() => {
                this.car.setBrake(0, 0);
                this.car.setBrake(0, 1);
            }, 100);
            this.car.applyEngineForce(0, 0);
            this.car.applyEngineForce(0, 1);
            this.car.applyEngineForce(0, 2);
            this.car.applyEngineForce(0, 3);
            this.car.chassisBody.angularVelocity.set(0, 0, 0);
            this.car.chassisBody.velocity.set(0, 0, 0);
        }
        const updateGuiChanges = () => {
            this.car.chassisBody.shapes = [];
            this.car.chassisBody.addShape(new CANNON.Box(new CANNON.Vec3(this.chassisDimension.x * 0.5, this.chassisDimension.y * 0.5, this.chassisDimension.z * 0.5)));
            this.chassis.helpChassis.scale.set(this.chassisDimension.x, this.chassisDimension.y, this.chassisDimension.z);
        }
        const updateWheelOptions = () => {
            for(let i = 0 ; i < this.car.wheelInfos.length; i++) {
                this.car.wheelInfos[i] = {...this.car.wheelInfos[i], ...vehicleOptions};
            }
        }
        resetCar();
    }

    update() {
        const updateWorld = () => {
            if(this.car && this.chassis && this.wheels[0]){
                this.chassis.position.set(
                    this.car.chassisBody.position.x + this.chassisModelPos.x,
                    this.car.chassisBody.position.y + this.chassisModelPos.y,
                    this.car.chassisBody.position.z + this.chassisModelPos.z
                );
                this.chassis.quaternion.copy(this.car.chassisBody.quaternion);
                this.chassis.helpChassis.position.copy(this.car.chassisBody.position);
                this.chassis.helpChassis.quaternion.copy(this.car.chassisBody.quaternion);
                for(let i = 0 ; i < 4 ; i++) {
                    if(this.wheels[i].helpWheels && this.car.wheelInfos[i]) {
                        this.car.updateWheelTransform(i);
                        this.wheels[i].position.copy(this.car.wheelInfos[i].worldTransform.position);
                        this.wheels[i].quaternion.copy(this.car.wheelInfos[i].worldTransform.quaternion);
                        this.wheels[i].helpWheels.position.copy(this.car.wheelInfos[i].worldTransform.position);
                        this.wheels[i].helpWheels.quaternion.copy(this.car.wheelInfos[i].worldTransform.quaternion);
                    }
                }
            }
        }
        this.world.addEventListener('postStep', updateWorld);
    }
}
