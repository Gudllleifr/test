---
title: Use Case-диаграмма
sidebar_position: 2
description: Диаграмма прецедентов, показывающая акторов и их взаимодействие с системой API Contract Hub
---

Диаграмма показывает акторов системы и их взаимодействие с функциями API Contract Hub в рамках MVP v1.0.

## Диаграмма {#diagram}

```plantuml
@startuml
left to right direction

skinparam packageStyle rectangle
skinparam BackgroundColor white
skinparam usecase {
    BackgroundColor #F8F9FA
    BorderColor #343A40
    ArrowColor #495057
}
skinparam actor {
    BackgroundColor #E9ECEF
    BorderColor #343A40
}

actor "Разработчик" as Dev
actor "Архитектор" as Arch
actor "Технический\nруководитель" as Lead

Arch -up-|> Dev

rectangle "API Contract Hub" {

  package "Управление контрактами API" {
    usecase "Зарегистрировать сервис\nи загрузить контракт" as UC_Register
    usecase "Загрузить новую версию\nконтракта" as UC_UploadVersion
    usecase "Просмотреть историю\nверсий" as UC_History

    usecase "Валидировать контракт" as UC_Validate
    usecase "Сохранить контракт\nи версию" as UC_Save
  }

  package "Анализ изменений" {
    usecase "Сравнить версии\nконтракта" as UC_Compare
    usecase "Классифицировать изменения\n(oasdiff)" as UC_Classify
    usecase "Обнаружить критические\nизменения" as UC_Critical
  }

  package "Анализ архитектуры" {
    usecase "Просмотреть граф\nзависимостей" as UC_Graph
    usecase "Анализировать влияние\nизменений" as UC_Impact
    usecase "Найти зависимые\nсервисы" as UC_Dependencies
  }
}

Dev --> UC_Register
Dev --> UC_UploadVersion
Dev --> UC_History
Dev --> UC_Compare
Dev --> UC_Graph
Dev --> UC_Impact

Lead --> UC_Graph
Lead --> UC_Compare

UC_Register ..> UC_Validate : <<include>>
UC_Register ..> UC_Save : <<include>>

UC_UploadVersion ..> UC_Validate : <<include>>
UC_UploadVersion ..> UC_Compare : <<include>>

UC_Compare ..> UC_Classify : <<include>>
UC_Compare ..> UC_Critical : <<include>>

UC_Impact ..> UC_Dependencies : <<include>>
UC_Impact ..> UC_Compare : <<extend>>

@enduml
```

## Акторы системы {#actors}

| Актор | Роль в системе | Use Cases |
|-------|---------------|-----------|
| Разработчик серверной части | Основной пользователь. Регистрирует сервисы, загружает контракты, анализирует изменения | UC-001, UC-002, UC-003, UC-004, UC-005 |
| Архитектор решений | Дополнительный актор с расширенными правами. Видит всю архитектуру, выполняет откат версий | UC-001, UC-002, UC-003, UC-004, UC-005 |
| Технический руководитель команды | Просматривает граф зависимостей и статус контрактов команды | UC-003 |

## Описание Use Cases {#use-cases}

Детальные спецификации каждого Use Case описаны в разделе [Функциональные требования](../Требования/functional-requirements).

| ID | Название | Приоритет |
|----|---------|----------|
| UC-001 | Регистрация нового сервиса и загрузка OpenAPI-контракта | Must Have |
| UC-002 | Сравнение версий контракта и обнаружение критических изменений | Must Have |
| UC-003 | Просмотр графа зависимостей сервисов | Must Have |
| UC-004 | Анализ влияния изменений на зависимые сервисы | Should Have |
| UC-005 | Просмотр истории версий контракта | Should Have |

## Границы системы {#system-boundaries}

**Внутри системы:** управление реестром контрактов, сравнение версий, граф зависимостей, анализ влияния, история версий, аутентификация.

**Вне системы:** контрактное тестирование (Pact), мониторинг производительности (Prometheus/Grafana), управление шлюзом API, уведомления (v2.0).
