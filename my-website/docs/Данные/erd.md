---
title: Проектирование ERD
sidebar_position: 2
description: Концептуальная, логическая и физическая модели базы данных API Contract Hub
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Модель данных представлена в трёх уровнях детализации: концептуальный (домен без деталей), логический (атрибуты и ограничения) и физический (PostgreSQL-специфичные решения).

## Уровень 1 — Концептуальная модель {#conceptual}

Центральная сущность — **SERVICE**. Сервисы связаны друг с другом через зависимости: один сервис вызывает API другого. Это классическая связь «многие ко многим», реализованная через **DEPENDENCY** — потому что у самой связи есть собственные атрибуты (кто и когда зарегистрировал).

Каждый сервис накапливает историю версий своего контракта — сущность **CONTRACT_VERSION**: один сервис — много версий, каждая версия — ровно один сервис.

**USER** — сквозная сущность: пользователь регистрирует сервисы, загружает версии, управляет зависимостями. Все изменяющие действия порождают записи в **AUDIT_LOG**.

<!-- 
  ВСТАВЬТЕ КОНЦЕПТУАЛЬНУЮ ДИАГРАММУ ЗДЕСЬ.
  
  Рекомендуется использовать draw.io или dbdiagram.io.
  Ссылка на редактирование диаграммы: https://dbdiagram.io
-->

<details>
<summary>Код концептуальной модели (dbdiagram.io)</summary>

```
// УРОВЕНЬ 1 — КОНЦЕПТУАЛЬНАЯ МОДЕЛЬ
// API Contract Hub | ООО «ПринтСтройМонтажСервис»

Table SERVICE {
  id integer [pk]
  Note: 'Микросервис в реестре контрактов'
}

Table CONTRACT_VERSION {
  id         integer [pk]
  service_id integer
  user_id    integer
  Note: 'Версия OpenAPI-контракта сервиса'
}

Table DEPENDENCY {
  id        integer [pk]
  source_id integer
  target_id integer
  user_id   integer
  Note: 'Направленная зависимость: потребитель → поставщик'
}

Table USER {
  id integer [pk]
  Note: 'Пользователь системы: разработчик, архитектор или QA'
}

Table AUDIT_LOG {
  id      integer [pk]
  user_id integer
  Note: 'Журнал всех изменяющих действий'
}

Ref: SERVICE.id < CONTRACT_VERSION.service_id
Ref: USER.id < CONTRACT_VERSION.user_id
Ref: SERVICE.id < DEPENDENCY.source_id
Ref: SERVICE.id < DEPENDENCY.target_id
Ref: USER.id < DEPENDENCY.user_id
Ref: USER.id < AUDIT_LOG.user_id
```

</details>

## Уровень 2 — Логическая модель {#logical}

На логическом уровне добавляются атрибуты, типы данных (абстрактные), первичные и внешние ключи, бизнес-ограничения.

<!-- ВСТАВЬТЕ ЛОГИЧЕСКУЮ ДИАГРАММУ ЗДЕСЬ -->

### Ключевые решения {#logical-decisions}

**Enum вместо справочников.** Ни один набор значений не отвечает критерию «добавить новое значение через INSERT без деплоя»: домены сервисов, версии OpenAPI, роли пользователей жёстко связаны с кодом приложения. Поэтому все наборы реализованы через enum.

**`contract_version` как таблица истории (L3).** Строки только добавляются, никогда не редактируются и не удаляются (BR-018). Откат создаёт новую запись (BR-019). Отдельная таблица истории не нужна.

**`dependency` как промежуточная таблица (M:N+).** Связь SERVICE↔SERVICE — «многие ко многим», и у самой связи есть атрибуты: кто и когда зарегистрировал. Поэтому `dependency` — полноценная сущность.

**`change_summary` — денормализованный агрегат.** Список версий показывает счётчики изменений для каждой версии. Вычислять их через oasdiff на каждый запрос страницы было бы дорого. Агрегат вычисляется один раз при загрузке и сохраняется в поле `change_summary (jsonb)`.

<details>
<summary>Код логической модели (dbdiagram.io)</summary>

```
// УРОВЕНЬ 2 — ЛОГИЧЕСКАЯ МОДЕЛЬ

enum service_domain { payments; orders; users; logistics; platform; analytics; other }
enum openapi_spec_version { "2.0"; "3.0"; "3.1" }
enum spec_format { json; yaml }
enum user_role { developer; architect; qa }
enum audit_action {
  service_created; version_uploaded; dependency_created;
  dependency_deleted; version_rolled_back
}

Table service {
  id                 uuid [pk, not null]
  name               varchar(100) [not null, unique]
  domain             service_domain [not null]
  owner_team         varchar(255) [not null]
  owner_email        varchar(255) [not null]
  repository_url     varchar(500) [null]
  created_by_user_id uuid [not null, ref: > user.id]
  created_at         timestamp [not null]
  updated_at         timestamp [not null]
}

Table contract_version {
  id                   uuid [pk, not null]
  service_id           uuid [not null, ref: > service.id]
  version_number       varchar(10) [not null]
  spec_content         text [not null]
  spec_format          spec_format [not null]
  openapi_spec_version openapi_spec_version [not null]
  endpoints_count      integer [not null, default: 0]
  change_summary       jsonb [null]
  uploaded_by_user_id  uuid [not null, ref: > user.id]
  uploaded_at          timestamp [not null]
  is_active            boolean [not null, default: false]
  is_archived          boolean [not null, default: false]

  indexes { (service_id, version_number) [unique] }
}

Table dependency {
  id                    uuid [pk, not null]
  source_service_id     uuid [not null, ref: > service.id]
  target_service_id     uuid [not null, ref: > service.id]
  registered_by_user_id uuid [not null, ref: > user.id]
  registered_at         timestamp [not null]

  indexes { (source_service_id, target_service_id) [unique] }
}

Table user {
  id                 uuid [pk, not null]
  username           varchar(100) [not null, unique]
  email              varchar(255) [not null, unique]
  password_hash      varchar(255) [not null]
  role               user_role [not null]
  failed_login_count integer [not null, default: 0]
  locked_until       timestamp [null]
  created_at         timestamp [not null]
  last_login_at      timestamp [null]
}

Table audit_log {
  id          uuid [pk, not null]
  user_id     uuid [not null, ref: > user.id]
  action      audit_action [not null]
  entity_type varchar(50) [not null]
  entity_id   uuid [not null]
  ip_address  varchar(45) [not null]
  occurred_at timestamp [not null]
  metadata    jsonb [null]
}
```

</details>

## Уровень 3 — Физическая модель {#physical}

На физическом уровне логическая схема получает конкретные типы данных PostgreSQL 14+, индексы и физические оптимизации. Каждое отличие от логической модели обосновано NFR или измеримой проблемой производительности.

<!-- ВСТАВЬТЕ ФИЗИЧЕСКУЮ ДИАГРАММУ ЗДЕСЬ -->

### Ключевые физические решения {#physical-decisions}

**P1 — Разделение `contract_version` на горячую и холодную части.** Метаданные версий читаются часто (~15 запросов/сессию), а `spec_content` только при сравнении и просмотре. Размер одного `spec_content` — 50 КБ до 5 МБ. PostgreSQL читает строки целиком с диска, поэтому пагинированный запрос на 20 версий без разбивки читал бы до 100 МБ вместо ~10 КБ метаданных. `spec_content` вынесен в отдельную таблицу `contract_version_content` (1:1).

**P2 — Денормализация `service.current_version_id`.** Реестр сервисов открывается ~15 раз за сессию. Без денормализации каждый запрос списка требовал бы JOIN с `contract_version` и фильтр `WHERE is_active = true`. Поле добавлено как soft-ссылка без DDL FK constraint (во избежание циклической зависимости) и обновляется атомарно в одной транзакции.

**P3 — `timestamptz` вместо `timestamp`.** Серверы могут находиться в разных часовых поясах. `timestamptz` хранит момент в UTC и корректно конвертируется при отображении.

**P4 — Функциональный индекс `lower(name)`.** BR-001 требует уникальности имени сервиса без учёта регистра. Стандартный UNIQUE constraint регистрочувствителен. Единственный корректный способ в PostgreSQL — уникальный индекс на выражение `lower(name)`.

**P4 — Partial index на `is_active`.** Запрос «найти активную версию сервиса» выполняется при открытии каждой страницы. Из всех версий `is_active = true` ровно у одной строки на сервис. Partial index `WHERE is_active = true` в разы меньше и быстрее полного индекса.

**P5 — Партиционирование `audit_log`.** Журнал накапливает ~5 500 записей/день = ~165 000 строк/мес. Ротация каждые 30 дней (NFR-012). Без партиционирования очистка через `DELETE WHERE occurred_at < ...` порождает bloat и конкурирует с активной записью. С партиционированием по месяцу ротация — это `DROP TABLE audit_log_YYYY_MM`, мгновенная операция.

**P6 — Тип `inet` для IP-адресов.** PostgreSQL нативно поддерживает IPv4 и IPv6, операторы сравнения подсетей, хранит компактнее `varchar(45)`.

<details>
<summary>Код физической модели (dbdiagram.io)</summary>

```
// УРОВЕНЬ 3 — ФИЗИЧЕСКАЯ МОДЕЛЬ (PostgreSQL 14+)

enum service_domain { payments; orders; users; logistics; platform; analytics; other }
enum openapi_spec_version { "2.0"; "3.0"; "3.1" }
enum spec_format { json; yaml }
enum user_role { developer; architect; qa }
enum audit_action {
  service_created; version_uploaded; dependency_created;
  dependency_deleted; version_rolled_back
}

Table user {
  id                 uuid        [pk, not null, default: `gen_random_uuid()`]
  username           varchar(100)[not null, unique]
  email              varchar(255)[not null, unique]
  password_hash      varchar(255)[not null]
  role               user_role   [not null]
  failed_login_count integer     [not null, default: 0]
  locked_until       timestamptz [null]
  created_at         timestamptz [not null, default: `now()`]
  last_login_at      timestamptz [null]

  indexes {
    (email)    [name: 'idx_user_email']
    (username) [name: 'idx_user_username']
  }
}

Table service {
  id                 uuid           [pk, not null, default: `gen_random_uuid()`]
  name               varchar(100)   [not null, unique]
  domain             service_domain [not null]
  owner_team         varchar(255)   [not null]
  owner_email        varchar(255)   [not null]
  repository_url     varchar(500)   [null]
  current_version_id uuid           [null]  // денормализация P2
  created_by_user_id uuid           [not null, ref: > user.id]
  created_at         timestamptz    [not null, default: `now()`]
  updated_at         timestamptz    [not null, default: `now()`]

  indexes {
    (`lower(name)`) [unique, name: 'uq_service_name_ci']   // P4
    (domain)        [name: 'idx_service_domain']
    (owner_team)    [name: 'idx_service_team']
  }
}

// P1: горячая часть — только метаданные
Table contract_version {
  id                   uuid        [pk, not null, default: `gen_random_uuid()`]
  service_id           uuid        [not null, ref: > service.id]
  version_number       varchar(10) [not null]
  openapi_spec_version openapi_spec_version [not null]
  spec_format          spec_format [not null]
  endpoints_count      integer     [not null, default: 0]
  change_summary       jsonb       [null]
  uploaded_by_user_id  uuid        [not null, ref: > user.id]
  uploaded_at          timestamptz [not null, default: `now()`]
  is_active            boolean     [not null, default: false]
  is_archived          boolean     [not null, default: false]

  indexes {
    (service_id, version_number) [unique, name: 'uq_cv_service_version']
    (service_id)                 [name: 'idx_cv_service_id']
    // Partial index P4: CREATE INDEX ON contract_version (service_id) WHERE is_active = true
    (service_id, is_archived)    [name: 'idx_cv_not_archived']
  }
}

// P1: холодная часть — только spec_content
Table contract_version_content {
  version_id   uuid [pk, not null, ref: - contract_version.id]
  spec_content text [not null]
}

Table dependency {
  id                    uuid        [pk, not null, default: `gen_random_uuid()`]
  source_service_id     uuid        [not null, ref: > service.id]
  target_service_id     uuid        [not null, ref: > service.id]
  registered_by_user_id uuid        [not null, ref: > user.id]
  registered_at         timestamptz [not null, default: `now()`]

  indexes {
    (source_service_id, target_service_id) [unique, name: 'uq_dependency_pair']
    (source_service_id) [name: 'idx_dep_source']
    (target_service_id) [name: 'idx_dep_target']
  }
}

// P5: партиционирование по месяцу
// DDL: CREATE TABLE audit_log (...) PARTITION BY RANGE (occurred_at);
Table audit_log {
  id          uuid         [not null, default: `gen_random_uuid()`]
  user_id     uuid         [not null, ref: > user.id]
  action      audit_action [not null]
  entity_type varchar(50)  [not null]
  entity_id   uuid         [not null]
  ip_address  inet         [not null]          // P6
  occurred_at timestamptz  [not null, default: `now()`]
  metadata    jsonb        [null]

  indexes {
    (occurred_at)            [name: 'idx_al_time']
    (user_id, occurred_at)   [name: 'idx_al_user_time']
    (entity_id, occurred_at) [name: 'idx_al_entity_time']
  }
}
```

</details>
