# Learn-CI

## Запуск проекта

После установки репозитория, как написано в требовании к ДЗ, надо ввести ```cd server && npm install && npm start``` и ```cd agent && npm install && npm start``` в разных вкладках командной строки.

## Описание проекта

Приложение работает так, что вы вводите данные, оно создаёт билд с состоянием ```PENDING```, который вы сможете увидеть сразу после нажатия кнопки ```New build```. Далее задание передаётся клиенту, который по окончанию возвращает билд с состоянием ```FAILED``` или ```SUCCESS```, изменение на клиенте можно увидеть, если периодически перезагружать страницу. Полученный от агента билд сохраняется на сервере в файле ```builds.json```.

Основные способы обработки ошибок сводятся к их выводу в консоли, так как интерфейс статичный и не представляется возможным в режиме реального времени выводить эти ошибки на клиенте.

Не совсем понял задание про регистрацию агентов, их учёт и т.д. Сделал каждую сборку асинхронной через ```setTimeout```, так что перегрузок быть не должно. В моём случае получается, что агент один, а его процессы асинхронны, а значит сервер не может не справиться с поступающими заявками.

**ВАЖНО!** Если будете очищать файл ```builds.json``` при тестировании, то необходимо оставить в нём пустой массив ```[]```.
