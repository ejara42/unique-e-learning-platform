"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAllSubscribers = registerAllSubscribers;
const enrollmentSubscribers_1 = require("./enrollmentSubscribers");
const courseSubscribers_1 = require("./courseSubscribers");
function registerAllSubscribers() {
    (0, enrollmentSubscribers_1.registerEnrollmentSubscribers)();
    (0, courseSubscribers_1.registerCourseSubscribers)();
    console.log('📡 [EventBus] Enterprise event subscribers successfully registered.');
}
