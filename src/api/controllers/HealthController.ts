import {
    JsonController, Get
} from 'routing-controllers';

/**
 * Health check for service running
 */
@JsonController('/v1/health')
export class HealthController {
    @Get()
    public health() {
        return true;
    }
}
