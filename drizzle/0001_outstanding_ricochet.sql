CREATE TABLE `receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`refuelingId` int NOT NULL,
	`storageKey` varchar(255) NOT NULL,
	`storageUrl` text NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(50) NOT NULL,
	`fileSize` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `receipts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `refuelings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` timestamp NOT NULL,
	`plate` varchar(20) NOT NULL,
	`fuelType` varchar(50) NOT NULL,
	`pricePerLiter` decimal(10,2) NOT NULL,
	`litersRefueled` decimal(10,2) NOT NULL,
	`totalPrice` decimal(10,2) NOT NULL,
	`gasStation` varchar(255) NOT NULL,
	`km` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `refuelings_id` PRIMARY KEY(`id`)
);
