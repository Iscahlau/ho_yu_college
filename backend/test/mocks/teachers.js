"use strict";
/**
 * Mock Teacher Data
 * 3 teacher records with different roles and responsibilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOCK_ADMIN_PASSWORD = exports.MOCK_TEACHER_PASSWORD = exports.mockTeachers = void 0;
exports.mockTeachers = [
    {
        teacher_id: 'TCH001',
        name: 'Mr. Wong',
        password: 'teacher123',
        responsible_class: ['1A', '2A'],
        last_login: '2024-01-15T08:00:00.000Z',
        is_admin: false,
    },
    {
        teacher_id: 'TCH002',
        name: 'Ms. Chan',
        password: 'teacher123',
        responsible_class: ['1B'],
        last_login: '2024-01-16T08:30:00.000Z',
        is_admin: false,
    },
    {
        teacher_id: 'TCH003',
        name: 'Dr. Lee',
        password: 'admin123',
        responsible_class: ['2B'],
        last_login: '2024-01-17T07:45:00.000Z',
        is_admin: true,
    },
];
// Export passwords for testing purposes
exports.MOCK_TEACHER_PASSWORD = 'teacher123';
exports.MOCK_ADMIN_PASSWORD = 'admin123';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVhY2hlcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0ZWFjaGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7QUFFVSxRQUFBLFlBQVksR0FBRztJQUMxQjtRQUNFLFVBQVUsRUFBRSxRQUFRO1FBQ3BCLElBQUksRUFBRSxVQUFVO1FBQ2hCLFFBQVEsRUFBRSxZQUFZO1FBQ3RCLGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQztRQUMvQixVQUFVLEVBQUUsMEJBQTBCO1FBQ3RDLFFBQVEsRUFBRSxLQUFLO0tBQ2hCO0lBQ0Q7UUFDRSxVQUFVLEVBQUUsUUFBUTtRQUNwQixJQUFJLEVBQUUsVUFBVTtRQUNoQixRQUFRLEVBQUUsWUFBWTtRQUN0QixpQkFBaUIsRUFBRSxDQUFDLElBQUksQ0FBQztRQUN6QixVQUFVLEVBQUUsMEJBQTBCO1FBQ3RDLFFBQVEsRUFBRSxLQUFLO0tBQ2hCO0lBQ0Q7UUFDRSxVQUFVLEVBQUUsUUFBUTtRQUNwQixJQUFJLEVBQUUsU0FBUztRQUNmLFFBQVEsRUFBRSxVQUFVO1FBQ3BCLGlCQUFpQixFQUFFLENBQUMsSUFBSSxDQUFDO1FBQ3pCLFVBQVUsRUFBRSwwQkFBMEI7UUFDdEMsUUFBUSxFQUFFLElBQUk7S0FDZjtDQUNGLENBQUM7QUFFRix3Q0FBd0M7QUFDM0IsUUFBQSxxQkFBcUIsR0FBRyxZQUFZLENBQUM7QUFDckMsUUFBQSxtQkFBbUIsR0FBRyxVQUFVLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIE1vY2sgVGVhY2hlciBEYXRhXG4gKiAzIHRlYWNoZXIgcmVjb3JkcyB3aXRoIGRpZmZlcmVudCByb2xlcyBhbmQgcmVzcG9uc2liaWxpdGllc1xuICovXG5cbmV4cG9ydCBjb25zdCBtb2NrVGVhY2hlcnMgPSBbXG4gIHtcbiAgICB0ZWFjaGVyX2lkOiAnVENIMDAxJyxcbiAgICBuYW1lOiAnTXIuIFdvbmcnLFxuICAgIHBhc3N3b3JkOiAndGVhY2hlcjEyMycsXG4gICAgcmVzcG9uc2libGVfY2xhc3M6IFsnMUEnLCAnMkEnXSxcbiAgICBsYXN0X2xvZ2luOiAnMjAyNC0wMS0xNVQwODowMDowMC4wMDBaJyxcbiAgICBpc19hZG1pbjogZmFsc2UsXG4gIH0sXG4gIHtcbiAgICB0ZWFjaGVyX2lkOiAnVENIMDAyJyxcbiAgICBuYW1lOiAnTXMuIENoYW4nLFxuICAgIHBhc3N3b3JkOiAndGVhY2hlcjEyMycsXG4gICAgcmVzcG9uc2libGVfY2xhc3M6IFsnMUInXSxcbiAgICBsYXN0X2xvZ2luOiAnMjAyNC0wMS0xNlQwODozMDowMC4wMDBaJyxcbiAgICBpc19hZG1pbjogZmFsc2UsXG4gIH0sXG4gIHtcbiAgICB0ZWFjaGVyX2lkOiAnVENIMDAzJyxcbiAgICBuYW1lOiAnRHIuIExlZScsXG4gICAgcGFzc3dvcmQ6ICdhZG1pbjEyMycsXG4gICAgcmVzcG9uc2libGVfY2xhc3M6IFsnMkInXSxcbiAgICBsYXN0X2xvZ2luOiAnMjAyNC0wMS0xN1QwNzo0NTowMC4wMDBaJyxcbiAgICBpc19hZG1pbjogdHJ1ZSxcbiAgfSxcbl07XG5cbi8vIEV4cG9ydCBwYXNzd29yZHMgZm9yIHRlc3RpbmcgcHVycG9zZXNcbmV4cG9ydCBjb25zdCBNT0NLX1RFQUNIRVJfUEFTU1dPUkQgPSAndGVhY2hlcjEyMyc7XG5leHBvcnQgY29uc3QgTU9DS19BRE1JTl9QQVNTV09SRCA9ICdhZG1pbjEyMyc7XG4iXX0=