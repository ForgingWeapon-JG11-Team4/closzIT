import { Controller, Get, Param, NotFoundException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('queue')
export class QueueController {
    private readonly logger = new Logger(QueueController.name);

    constructor(
        @InjectQueue('flatten-queue') private flattenQueue: Queue,
        @InjectQueue(process.env.VTO_QUEUE_NAME || 'vto-queue') private vtoQueue: Queue,
    ) { }

    @Get('job/:type/:id')
    async getJobStatus(
        @Param('type') type: string,
        @Param('id') jobId: string,
    ) {
        let queue: Queue;

        if (type === 'flatten') {
            queue = this.flattenQueue;
        } else if (type === 'vto') {
            queue = this.vtoQueue;
        } else {
            throw new NotFoundException('Invalid job type');
        }

        const job = await queue.getJob(jobId);

        if (!job) {
            this.logger.warn(`[Job Status] Job ${jobId} not found in ${type} queue`);
            return { status: 'not_found', jobId };
        }

        const state = await job.getState();
        const hasResult = !!job.returnvalue;


        if (state === 'completed') {
            return {
                status: 'completed',
                jobId,
                result: job.returnvalue,
            };
        }

        if (state === 'failed') {
            return {
                status: 'failed',
                jobId,
                error: job.failedReason,
            };
        }

        // waiting, active, delayed
        return {
            status: state,
            jobId,
            progress: job.progress,
        };
    }

    @Get('stats/:type')
    async getQueueStats(@Param('type') type: string) {
        let queue: Queue;

        if (type === 'flatten') {
            queue = this.flattenQueue;
        } else if (type === 'vto') {
            queue = this.vtoQueue;
        } else {
            throw new NotFoundException('Invalid queue type');
        }

        const [waiting, active, completed, failed] = await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
        ]);

        return {
            type,
            waiting,
            active,
            completed,
            failed,
        };
    }
}
