/* eslint-disable valid-jsdoc */

import LoadMoreButtonComponent from "../components/load-more-button.js";
import NoTasksComponent from "../components/no-tasks.js";
import SortComponent, {SortType} from "../components/sort.js";
import TaskController from "./task.js";
import TasksComponent from "../components/tasks.js";
import {remove, render, RenderPosition} from "../utils/render.js";

/** Количество задач, которое по-умолчанию будет отображаться */
const SHOWING_TASKS_COUNT_ON_START = 8;

/** Количество задач, которое будет подгружаться по кнопке LoadMore */
const SHOWING_TASKS_COUNT_BY_BUTTON = 8;

/**
 * Функция, которая рендерит задачи. Создает массив контроллеров всех показанных задач
 * @param {Element} taskListElement Элемент, куда будут добавляться задачи
 * @param {Array} tasks Массив задач, которые нужно отрисовать
 * @param {Function} onDataChange Метод, который будет вызван, при изменении данных
 * @param {Function} onViewChange Метод, который будет возвращать карточку в дефолтное состояние
 */
const renderTasks = (taskListElement, tasks, onDataChange, onViewChange) => {
  return tasks.map((task) => {
    const taskController = new TaskController(taskListElement, onDataChange, onViewChange);

    taskController.render(task);

    return taskController;
  });
};

/**
 * Функция, которая возвращает отсортированный массив задач
 * @param {Array} tasks Массив задач
 * @param {*} sortType Тип сортировки
 * @param {Number} from Индекс элемента, начиная с которого нужно возвращать задачи
 * @param {Number} to Индекс элемента, до которого нужно возвращать задачи
 */
const getSortedTasks = (tasks, sortType, from, to) => {
  let sortedTasks = [];
  const showingTasks = tasks.slice();

  switch (sortType) {
    case SortType.DATE_UP:
      sortedTasks = showingTasks.sort((a, b) => a.dueDate - b.dueDate);
      break;
    case SortType.DATE_DOWN:
      sortedTasks = showingTasks.sort((a, b) => b.dueDate - a.dueDate);
      break;
    case SortType.DEFAULT:
      sortedTasks = showingTasks;
      break;
  }

  return sortedTasks.slice(from, to);
};

/** Контроллер: Доска задач */
export default class BoardController {
  /**
   * Конструктор контроллера "Доска задач"
   * @param {*} container Компонент, внутри которого будет доска
   * @param {*} taskModel Модель задач
   */
  constructor(container, taskModel) {
    /** Свойство контроллера: Компонент, внутри которого будет текущая доска */
    this._container = container;
    /** Свойство контроллера: Модель задач */
    this._tasksModel = taskModel;
    /** Свойство контроллера: Массив контроллеров отображенных задач (наблюдателей) */
    this._showedTaskControllers = [];
    /** Свойство контроллера: Количество отображаемых задач */
    this._showingTasksCount = SHOWING_TASKS_COUNT_ON_START;
    /** Свойство контроллера: Компонент доски без задач */
    this._noTasksComponent = new NoTasksComponent();
    /** Свойство контроллера: Компонент доски - Сортировка */
    this._sortComponent = new SortComponent();
    /** Свойство контроллера: Компонент доски - Блок со всеми задачами */
    this._tasksComponent = new TasksComponent();
    /** Свойство контроллера: Компонент доски LoadMore */
    this._loadMoreButtonComponent = new LoadMoreButtonComponent();

    /** Свойство контроллера: метод изменения данных и перерисовки компонентов в контексте текущего контроллера доски */
    this._onDataChange = this._onDataChange.bind(this);
    /** Свойство контроллера: метод изменения типа сортировки в контексте текущего контроллера доски */
    this._onSortTypeChange = this._onSortTypeChange.bind(this);
    /** Свойство контроллера: метод, который уведомляет все контроллеры задач, что они должны вернуться в дефолтный режим в контексте текущего контроллера доски */
    this._onViewChange = this._onViewChange.bind(this);

    /** Добавление обработчика на изменение типа сортировки */
    this._sortComponent.setSortTypeChangeHandler(this._onSortTypeChange);
  }

  /** Метод для рендеринга доски */
  render() {
    /** Элемент, внутри которого будет рендериться доска */
    const container = this._container.getElement();

    /** Массив всех задач. полученный из модели */
    const tasks = this._tasksModel.getTasks();
    /** Флаг для проверки того, что есть НЕ архивные задачи */
    const isAllTasksArchived = tasks.every((task) => task.isArchive);

    if (isAllTasksArchived) {
      render(container, this._noTasksComponent, RenderPosition.BEFOREEND);
      return;
    }

    render(container, this._sortComponent, RenderPosition.BEFOREEND);
    render(container, this._tasksComponent, RenderPosition.BEFOREEND);

    this._renderTasks(tasks.slice(0, this._showingTasksCount));

    this._renderLoadMoreButton();

  }

  /**
   * Приватный метод для рендеринга задач
   * @param {Array} tasks Массив задач
   */
  _renderTasks(tasks) {
    /** Элемент, внутри которого будут рендериться задачи */
    const taskListElement = this._tasksComponent.getElement();

    const newTasks = renderTasks(taskListElement, tasks, this._onDataChange, this._onViewChange);
    this._showedTaskControllers = this._showedTaskControllers.concat(newTasks);

    this._showingTasksCount = this._showedTaskControllers.length;
  }

  /** Приватный метод, для отрисовки кнопки LoadMore*/
  _renderLoadMoreButton() {
    remove(this._loadMoreButtonComponent);

    if (this._showingTasksCount >= this._tasksModel.getTasks().length) {
      return;
    }

    /** Компронент, внутри которого будет кнопка LoadMore */
    const container = this._container.getElement();
    render(container, this._loadMoreButtonComponent, RenderPosition.BEFOREEND);

    /** Обработчик события клика по кнопке LoadMore */
    this._loadMoreButtonComponent.setClickHandler(() => {
      /** Количество показанных задач */
      const prevTasksCount = this._showingTasksCount;
      /** Массив всех задач. полученный из модели */
      const tasks = this._tasksModel.getTasks();
      /** Элемент доски со всеми задачами */
      const taskListElement = this._tasksComponent.getElement();
      this._showingTasksCount = this._showingTasksCount + SHOWING_TASKS_COUNT_BY_BUTTON;

      /** Массив отсортированных задач, которые появятся при клике на LoadMore */
      const sortedTasks = getSortedTasks(tasks, this._sortComponent.getSortType(), prevTasksCount, this._showingTasksCount);
      /** Массив новых отрендеренных сортированных задач */
      const newTasks = renderTasks(taskListElement, sortedTasks, this._onDataChange, this._onViewChange);

      this._showedTaskControllers = this._showedTaskControllers.concat(newTasks);
    });
  }

  /**
   * Приватный метод, который изменяет данные и перерисовывает компонент
   * @param {*} taskController Контроллер задачи
   * @param {*} oldData Старые данные
   * @param {*} newData Новые данные
   */
  _onDataChange(taskController, oldData, newData) {
    /** Флаг: Задача изменилась? */
    const isSuccess = this._tasksModel.updateTask(oldData.id, newData);

    if (isSuccess) {
      taskController.render(newData);
    }
  }

  /** Приватный метод, который уведомляет все контроллеры задач, что они должны вернуться в дефолтный режим  */
  _onViewChange() {
    this._showedTaskControllers.forEach((it) => it.setDefaultView());
  }

  /**
   * Приватный метод, который перерисовывает задачи при изменении типа сортировки
   * @param {*} sortType Тип сортировки
   */
  _onSortTypeChange(sortType) {
    this._showingTasksCount = SHOWING_TASKS_COUNT_ON_START;
    /** Массив всех задач. полученный из модели */
    const tasks = this._tasksModel.getTasks();
    /** Массив отсортированных задач */
    const sortedTasks = getSortedTasks(tasks, sortType, 0, this._showingTasksCount);
    /** Элемент доски со всеми задачами */
    const taskListElement = this._tasksComponent.getElement();

    taskListElement.innerHTML = ``;

    /** Массив новых отрендеренных сортированных задач */
    const newTasks = renderTasks(taskListElement, sortedTasks, this._onDataChange, this._onViewChange);
    this._showedTaskControllers = newTasks;

    this._renderLoadMoreButton();
  }
}
