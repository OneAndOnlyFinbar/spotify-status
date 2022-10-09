CREATE TABLE `tokens`
(
    `userId`       longtext   NOT NULL,
    `accessToken`  longtext   NOT NULL,
    `refreshToken` longtext   NOT NULL,
    `expiresAt`    mediumtext NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE `tokens`
    ADD PRIMARY KEY (`userId`(128));