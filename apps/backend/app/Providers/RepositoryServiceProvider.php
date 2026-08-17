<?php

namespace App\Providers;

use App\Repositories\Contracts\AuditLogRepositoryInterface;
use App\Repositories\Contracts\ClientRepositoryInterface;
use App\Repositories\Contracts\DocumentRepositoryInterface;
use App\Repositories\Contracts\InstallmentRepositoryInterface;
use App\Repositories\Contracts\LoanChargeRepositoryInterface;
use App\Repositories\Contracts\LoanRepositoryInterface;
use App\Repositories\Contracts\PaymentAllocationRepositoryInterface;
use App\Repositories\Contracts\PaymentRepositoryInterface;
use App\Repositories\Contracts\PaymentTypeRepositoryInterface;
use App\Repositories\Contracts\RefundRepositoryInterface;
use App\Repositories\Contracts\SettingRepositoryInterface;
use App\Repositories\Contracts\UserRepositoryInterface;
use App\Repositories\Eloquent\AuditLogRepository;
use App\Repositories\Eloquent\ClientRepository;
use App\Repositories\Eloquent\DocumentRepository;
use App\Repositories\Eloquent\InstallmentRepository;
use App\Repositories\Eloquent\LoanChargeRepository;
use App\Repositories\Eloquent\LoanRepository;
use App\Repositories\Eloquent\PaymentAllocationRepository;
use App\Repositories\Eloquent\PaymentRepository;
use App\Repositories\Eloquent\PaymentTypeRepository;
use App\Repositories\Eloquent\RefundRepository;
use App\Repositories\Eloquent\SettingRepository;
use App\Repositories\Eloquent\UserRepository;
use Illuminate\Support\ServiceProvider;

class RepositoryServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(UserRepositoryInterface::class, UserRepository::class);
        $this->app->bind(AuditLogRepositoryInterface::class, AuditLogRepository::class);
        $this->app->bind(LoanRepositoryInterface::class, LoanRepository::class);
        $this->app->bind(ClientRepositoryInterface::class, ClientRepository::class);
        $this->app->bind(PaymentRepositoryInterface::class, PaymentRepository::class);
        $this->app->bind(InstallmentRepositoryInterface::class, InstallmentRepository::class);
        $this->app->bind(LoanChargeRepositoryInterface::class, LoanChargeRepository::class);
        $this->app->bind(PaymentAllocationRepositoryInterface::class, PaymentAllocationRepository::class);
        $this->app->bind(SettingRepositoryInterface::class, SettingRepository::class);
        $this->app->bind(RefundRepositoryInterface::class, RefundRepository::class);
        $this->app->bind(DocumentRepositoryInterface::class, DocumentRepository::class);
        $this->app->bind(PaymentTypeRepositoryInterface::class, PaymentTypeRepository::class);
    }
}
