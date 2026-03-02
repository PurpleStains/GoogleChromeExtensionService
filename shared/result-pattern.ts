export class Result<T> {
    private readonly success: boolean;
    private readonly value?: T;
    private readonly error?: Error;

    private constructor(success: boolean, value?: T, error?: Error) {
        this.success = success;
        this.value = value;
        this.error = error;
    }

    static success<T>(value?: T): Result<T> {
        return new Result<T>(true, value);
    }

    static error<T>(error: Error): Result<T> {
        return new Result<T>(false, undefined, error);
    }

    isSuccess(): boolean {
        return this.success;
    }

    isFailure(): boolean {
        return !this.isSuccess();
    }

    getValue(): T | undefined {
        return this.value;
    }

    getError(): Error | undefined {
        return this.error;
    }
}