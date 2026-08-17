<?php

namespace App\Console\Commands;

use App\Services\PastDueService;
use Illuminate\Console\Command;

class ProcessPastDueLoans extends Command
{
    protected $signature = 'loans:process-past-due';

    protected $description = 'Detect past-due schedules, assess late fees once each, and update loan status';

    public function __construct(private readonly PastDueService $pastDueService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $result = $this->pastDueService->process();

        $this->info(sprintf(
            'Past-due processed: %d overdue schedules, %d marked past-due, %d late fees assessed, %d loans updated.',
            $result['overdue_schedules'],
            $result['past_due_marked'],
            $result['late_fees_assessed'],
            $result['loans_updated'],
        ));

        return self::SUCCESS;
    }
}
