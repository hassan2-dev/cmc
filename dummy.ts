export type User = {
    id: number;
    name: string;
    email: string;
    email_verified_at: null;
    created_at: string;
    updated_at: string;
}

export type City = {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
}

export type Admin = {
    id: number;
    user_id: number;
    city_id: number;
    created_at: string;
    updated_at: string;
    user: User;
}

export type Employee = {
    id: number;
    user_id: number;
    admin_id: number;
    city_id: number;
    created_at: string;
    updated_at: string;
    user: User;
    admin: Admin;
    city: City;
}

export const dummyEmployees: Employee[] = [
    {
        id: 1,
        user_id: 3,
        admin_id: 1,
        city_id: 1,
        created_at: "2024-12-23T11:08:49.000000Z",
        updated_at: "2024-12-23T11:08:49.000000Z",
        user: {
            id: 3,
            name: "hasan",
            email: "hasan@gmail.com",
            email_verified_at: null,
            created_at: "2024-12-23T11:08:49.000000Z",
            updated_at: "2024-12-31T12:25:54.000000Z"
        },
        admin: {
            id: 1,
            user_id: 2,
            city_id: 1,
            created_at: "2024-12-23T11:07:06.000000Z",
            updated_at: "2024-12-23T11:07:06.000000Z",
            user: {
                id: 2,
                name: "Admin User",
                email: "admin@example.com",
                email_verified_at: null,
                created_at: "2024-12-23T11:07:06.000000Z",
                updated_at: "2024-12-23T11:07:06.000000Z"
            }
        },
        city: {
            id: 1,
            name: "Basra",
            created_at: "2024-12-23T11:06:14.000000Z",
            updated_at: "2024-12-23T11:06:14.000000Z"
        }
    },
    {
        id: 2,
        user_id: 5,
        admin_id: 1,
        city_id: 1,
        created_at: "2024-12-31T12:14:06.000000Z",
        updated_at: "2024-12-31T12:14:06.000000Z",
        user: {
            id: 5,
            name: "hsn2",
            email: "hsn2@gmail.com",
            email_verified_at: null,
            created_at: "2024-12-31T12:14:06.000000Z",
            updated_at: "2024-12-31T12:14:06.000000Z"
        },
        admin: {
            id: 1,
            user_id: 2,
            city_id: 1,
            created_at: "2024-12-23T11:07:06.000000Z",
            updated_at: "2024-12-23T11:07:06.000000Z",
            user: {
                id: 2,
                name: "Admin User",
                email: "admin@example.com",
                email_verified_at: null,
                created_at: "2024-12-23T11:07:06.000000Z",
                updated_at: "2024-12-23T11:07:06.000000Z"
            }
        },
        city: {
            id: 1,
            name: "Basra",
            created_at: "2024-12-23T11:06:14.000000Z",
            updated_at: "2024-12-23T11:06:14.000000Z"
        }
    },
    {
        id: 3,
        user_id: 7,
        admin_id: 1,
        city_id: 1,
        created_at: "2025-01-13T08:04:00.000000Z",
        updated_at: "2025-01-13T08:04:00.000000Z",
        user: {
            id: 7,
            name: "mohammed",
            email: "mohammed@email.com",
            email_verified_at: null,
            created_at: "2025-01-13T08:04:00.000000Z",
            updated_at: "2025-01-13T08:04:00.000000Z"
        },
        admin: {
            id: 1,
            user_id: 2,
            city_id: 1,
            created_at: "2024-12-23T11:07:06.000000Z",
            updated_at: "2024-12-23T11:07:06.000000Z",
            user: {
                id: 2,
                name: "Admin User",
                email: "admin@example.com",
                email_verified_at: null,
                created_at: "2024-12-23T11:07:06.000000Z",
                updated_at: "2024-12-23T11:07:06.000000Z"
            }
        },
        city: {
            id: 1,
            name: "Basra",
            created_at: "2024-12-23T11:06:14.000000Z",
            updated_at: "2024-12-23T11:06:14.000000Z"
        }
    }
]; 