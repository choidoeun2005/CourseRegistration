import {
    DAYS,
    FILTER_PERIODS,
    getCollegeOptions,
    getCourseTypeOptions,
    getCreditOptions,
    getGeneralEducationAreaOptions,
    getDepartmentOptions
} from "../utils/courseFilterUtils";

const SEARCH_TARGETS = [
    { value: "all", label: "전체" },
    { value: "professor", label: "교수자" },
    { value: "code", label: "학수번호" },
    { value: "title", label: "과목명" }
];

function getDayLabel(state) {
    if (state === "include") return "포함";
    if (state === "exclude") return "제외";
    return "";
}

function getNextState(current) {
    if (current === "any") return "include";
    if (current === "include") return "exclude";
    return "any";
}

function getSearchTargetLabel(value) {
    return SEARCH_TARGETS.find((target) => target.value === value)?.label || "전체";
}

function getSlotKey(day, period) {
    return `${day}-${period}`;
}

function getSlotLabel(key) {
    const [day, period] = key.split("-");
    return `${day}${period}`;
}

function getSortedSlotKeys(keys) {
    const dayOrder = Object.fromEntries(DAYS.map((day, index) => [day, index]));

    return [...keys].sort((a, b) => {
        const [aDay, aPeriod] = a.split("-");
        const [bDay, bPeriod] = b.split("-");

        if (dayOrder[aDay] !== dayOrder[bDay]) {
            return dayOrder[aDay] - dayOrder[bDay];
        }

        return Number(aPeriod) - Number(bPeriod);
    });
}

function formatSlotChipText(keys) {
    const sorted = getSortedSlotKeys(keys);

    if (sorted.length <= 4) {
        return sorted.map(getSlotLabel).join(", ");
    }

    return `${sorted.slice(0, 3).map(getSlotLabel).join(", ")} 외 ${
        sorted.length - 3
    }개`;
}

function FilterApplyToggle({ enabled, disabled, onClick }) {
    return (
        <button
            type="button"
            className={`filter-apply-toggle ${enabled ? "active" : ""}`}
            disabled={disabled}
            onClick={onClick}
        >
            {enabled ? "적용중" : "미적용"}
        </button>
    );
}

function FilterChip({ children, onRemove }) {
    return (
        <button type="button" className="active-filter-chip" onClick={onRemove}>
            {children} ×
        </button>
    );
}

function OptionChip({ active, children, onClick }) {
    return (
        <button
            type="button"
            className={`detail-option-chip ${active ? "active" : ""}`}
            onClick={onClick}
        >
            {children}
        </button>
    );
}

function SearchTargetChip({ active, children, onClick }) {
    return (
        <button
            type="button"
            className={`search-target-chip ${active ? "active" : ""}`}
            onClick={onClick}
        >
            {children}
        </button>
    );
}

function DetailGroup({ title, children, wide = false }) {
    return (
        <div className={`detail-chip-group ${wide ? "wide" : ""}`}>
            <strong>{title}</strong>
            <div className="detail-chip-row">{children}</div>
        </div>
    );
}

function MiniTimeFilter({ timeSlots, onToggleCell, onToggleDay, onTogglePeriod }) {
    return (
        <div className="mini-time-filter">
            <div className="mini-time-filter-help">
                칸 클릭: 포함 → 제외 → 해제 전환 <br></br>
                요일·교시 헤더 클릭: 해당 줄 전체 변경
            </div>

            <div className="mini-time-grid">
                <div className="mini-time-corner" />

                {DAYS.map((day) => (
                    <button
                        type="button"
                        key={day}
                        className="mini-time-header"
                        onClick={() => onToggleDay(day)}
                        title={`${day}요일 전체 변경`}
                    >
                        {day}
                    </button>
                ))}

                {FILTER_PERIODS.map((period) => (
                    <div key={period} className="mini-time-row">
                        <button
                            type="button"
                            className="mini-time-period"
                            onClick={() => onTogglePeriod(period)}
                            title={`${period}교시 전체 변경`}
                        >
                            {period}
                        </button>

                        {DAYS.map((day) => {
                            const key = getSlotKey(day, period);
                            const state = timeSlots[key] || "any";

                            return (
                                <button
                                    type="button"
                                    key={key}
                                    className={`mini-time-cell ${state}`}
                                    onClick={() => onToggleCell(day, period)}
                                    title={`${day}${period}교시: ${
                                        state === "include"
                                            ? "포함"
                                            : state === "exclude"
                                                ? "제외"
                                                : "상관없음"
                                    }`}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>

            <div className="mini-time-legend">
                <span><i className="legend-box any" /> 상관없음</span>
                <span><i className="legend-box include" /> 포함</span>
                <span><i className="legend-box exclude" /> 제외</span>
            </div>
        </div>
    );
}

function FilterPanel({ courses, filters, onChange }) {
    const collegeOptions = getCollegeOptions(courses);
    const departmentOptions = getDepartmentOptions(
        courses,
        filters.college.value
    );
    const creditOptions = getCreditOptions(courses);
    const courseTypeOptions = getCourseTypeOptions(courses);
    const generalAreaOptions = getGeneralEducationAreaOptions(courses);

    const searchTarget = SEARCH_TARGETS.some(
        (target) => target.value === filters.searchTarget
    )
        ? filters.searchTarget
        : "all";
    const englishMode = filters.englishMode || "all";
    const timeSlots = filters.timeSlots || {};
    const selectedCourseTypes = Array.isArray(filters.courseTypes)
        ? filters.courseTypes.filter(Boolean)
        : filters.courseType
            ? [filters.courseType]
            : [];
    const isGeneralSelected = selectedCourseTypes.includes("교양");
    const departmentSelectValue = isGeneralSelected
        ? filters.generalArea || ""
        : filters.department.value;

    const updateFilters = (updater) => {
        onChange((prev) => {
            return typeof updater === "function" ? updater(prev) : updater;
        });
    };

    const setValue = (key, value) => {
        updateFilters((prev) => ({
            ...prev,
            [key]: value
        }));
    };

    const toggleBoolean = (key) => {
        updateFilters((prev) => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const setCollege = (value) => {
        updateFilters((prev) => ({
            ...prev,
            college: {
                value,
                enabled: Boolean(value)
            },
            department: {
                value: "",
                enabled: false
            },
            generalArea: ""
        }));
    };

    const setDepartment = (value) => {
        updateFilters((prev) => ({
            ...prev,
            department: {
                value: isGeneralSelected ? "" : value,
                enabled: Boolean(value)
            },
            generalArea: isGeneralSelected ? value : ""
        }));
    };

    const toggleCourseType = (type) => {
        updateFilters((prev) => {
            const nextCourseTypes = (() => {
                const current = Array.isArray(prev.courseTypes)
                    ? prev.courseTypes.filter(Boolean)
                    : prev.courseType
                        ? [prev.courseType]
                        : [];
                const next = current.includes(type)
                    ? current.filter((item) => item !== type)
                    : [...current, type];

                return next;
            })();
            const willUseGeneralArea = nextCourseTypes.includes("교양");
            const isTogglingGeneral = type === "교양";

            return {
                ...prev,
                courseType: "",
                courseTypes: nextCourseTypes,
                college:
                    isTogglingGeneral && willUseGeneralArea
                    ? {
                        value: "",
                        enabled: false
                    }
                    : prev.college,
                department: isTogglingGeneral
                    ? {
                        value: "",
                        enabled: false
                    }
                    : prev.department,
                generalArea: isTogglingGeneral ? "" : prev.generalArea
            };
        });
    };

    const removeCourseType = (type) => {
        updateFilters((prev) => {
            const current = Array.isArray(prev.courseTypes)
                ? prev.courseTypes.filter(Boolean)
                : prev.courseType
                    ? [prev.courseType]
                    : [];
            const next = current.filter((item) => item !== type);

            return {
                ...prev,
                courseType: "",
                courseTypes: next,
                generalArea: type === "교양" ? "" : prev.generalArea,
                department:
                    type === "교양"
                        ? {
                            value: "",
                            enabled: false
                        }
                        : prev.department
            };
        });
    };

    const toggleCollegeEnabled = () => {
        if (isGeneralSelected) return;

        updateFilters((prev) => ({
            ...prev,
            college: {
                ...prev.college,
                enabled: !prev.college.enabled
            }
        }));
    };

    const toggleDepartmentEnabled = () => {
        updateFilters((prev) => ({
            ...prev,
            department: {
                ...prev.department,
                enabled: !prev.department.enabled
            }
        }));
    };

    const toggleDay = (day) => {
        updateFilters((prev) => ({
            ...prev,
            dayStates: {
                ...prev.dayStates,
                [day]: getNextState(prev.dayStates[day])
            }
        }));
    };

    const setTimeSlot = (day, period, state) => {
        const key = getSlotKey(day, period);

        updateFilters((prev) => {
            const nextSlots = {
                ...(prev.timeSlots || {})
            };

            if (state === "any") {
                delete nextSlots[key];
            } else {
                nextSlots[key] = state;
            }

            return {
                ...prev,
                timeSlots: nextSlots
            };
        });
    };

    const toggleTimeSlot = (day, period) => {
        const key = getSlotKey(day, period);
        const current = timeSlots[key] || "any";
        const next = getNextState(current);

        setTimeSlot(day, period, next);
    };

    const getGroupNextState = (keys) => {
        const states = keys.map((key) => timeSlots[key] || "any");

        if (states.every((state) => state === "include")) {
            return "exclude";
        }

        if (states.every((state) => state === "exclude")) {
            return "any";
        }

        return "include";
    };

    const setManyTimeSlots = (keys, state) => {
        updateFilters((prev) => {
            const nextSlots = {
                ...(prev.timeSlots || {})
            };

            keys.forEach((key) => {
                if (state === "any") {
                    delete nextSlots[key];
                } else {
                    nextSlots[key] = state;
                }
            });

            return {
                ...prev,
                timeSlots: nextSlots
            };
        });
    };

    const toggleTimeSlotDay = (day) => {
        const keys = FILTER_PERIODS.map((period) => getSlotKey(day, period));
        setManyTimeSlots(keys, getGroupNextState(keys));
    };

    const toggleTimeSlotPeriod = (period) => {
        const keys = DAYS.map((day) => getSlotKey(day, period));
        setManyTimeSlots(keys, getGroupNextState(keys));
    };

    const includeSlotKeys = Object.entries(timeSlots)
        .filter(([, state]) => state === "include")
        .map(([key]) => key);

    const excludeSlotKeys = Object.entries(timeSlots)
        .filter(([, state]) => state === "exclude")
        .map(([key]) => key);

    const activeChips = [];

    if (filters.keyword) {
        activeChips.push(
            <FilterChip key="keyword" onRemove={() => setValue("keyword", "")}>
                {getSearchTargetLabel(searchTarget)} 검색: {filters.keyword}
            </FilterChip>
        );
    }

    if (filters.college.enabled && filters.college.value) {
        activeChips.push(
            <FilterChip
                key="college"
                onRemove={() =>
                    updateFilters((prev) => ({
                        ...prev,
                        college: {
                            ...prev.college,
                            enabled: false
                        }
                    }))
                }
            >
                대학: {filters.college.value}
            </FilterChip>
        );
    }

    if (!isGeneralSelected && filters.department.enabled && filters.department.value) {
        activeChips.push(
            <FilterChip
                key="department"
                onRemove={() =>
                    updateFilters((prev) => ({
                        ...prev,
                        department: {
                            ...prev.department,
                            enabled: false
                        }
                    }))
                }
            >
                학과: {filters.department.value}
            </FilterChip>
        );
    }

    if (isGeneralSelected && filters.department.enabled && filters.generalArea) {
        activeChips.push(
            <FilterChip
                key="generalArea"
                onRemove={() =>
                    updateFilters((prev) => ({
                        ...prev,
                        generalArea: "",
                        department: {
                            ...prev.department,
                            enabled: false
                        }
                    }))
                }
            >
                영역: {filters.generalArea}
            </FilterChip>
        );
    }

    DAYS.forEach((day) => {
        const state = filters.dayStates[day];

        if (state === "any") return;

        activeChips.push(
            <FilterChip
                key={`day-${day}`}
                onRemove={() =>
                    updateFilters((prev) => ({
                        ...prev,
                        dayStates: {
                            ...prev.dayStates,
                            [day]: "any"
                        }
                    }))
                }
            >
                {day} {state === "include" ? "포함" : "제외"}
            </FilterChip>
        );
    });

    if (includeSlotKeys.length > 0) {
        activeChips.push(
            <FilterChip
                key="includeSlots"
                onRemove={() =>
                    setManyTimeSlots(includeSlotKeys, "any")
                }
            >
                시간 포함: {formatSlotChipText(includeSlotKeys)}
            </FilterChip>
        );
    }

    if (excludeSlotKeys.length > 0) {
        activeChips.push(
            <FilterChip
                key="excludeSlots"
                onRemove={() =>
                    setManyTimeSlots(excludeSlotKeys, "any")
                }
            >
                시간 제외: {formatSlotChipText(excludeSlotKeys)}
            </FilterChip>
        );
    }

    if (filters.credit) {
        activeChips.push(
            <FilterChip key="credit" onRemove={() => setValue("credit", "")}>
                {filters.credit}학점
            </FilterChip>
        );
    }

    courseTypeOptions
        .filter((type) => selectedCourseTypes.includes(type))
        .forEach((type) => {
        activeChips.push(
            <FilterChip key={`courseType-${type}`} onRemove={() => removeCourseType(type)}>
                {type}
            </FilterChip>
        );
    });

    if (filters.onlyAvailable) {
        activeChips.push(
            <FilterChip
                key="onlyAvailable"
                onRemove={() => toggleBoolean("onlyAvailable")}
            >
                담을 수 있는 과목만
            </FilterChip>
        );
    }

    if (filters.excludeDropRestricted) {
        activeChips.push(
            <FilterChip
                key="excludeDropRestricted"
                onRemove={() => toggleBoolean("excludeDropRestricted")}
            >
                수강포기제한 제외
            </FilterChip>
        );
    }

    if (filters.onlyMooc) {
        activeChips.push(
            <FilterChip key="onlyMooc" onRemove={() => toggleBoolean("onlyMooc")}>
                MOOC
            </FilterChip>
        );
    }

    if (filters.onlyFlexible) {
        activeChips.push(
            <FilterChip
                key="onlyFlexible"
                onRemove={() => toggleBoolean("onlyFlexible")}
            >
                유연학기
            </FilterChip>
        );
    }

    if (filters.onlyRemote) {
        activeChips.push(
            <FilterChip key="onlyRemote" onRemove={() => toggleBoolean("onlyRemote")}>
                원격/녹강
            </FilterChip>
        );
    }

    if (englishMode === "only") {
        activeChips.push(
            <FilterChip
                key="englishOnly"
                onRemove={() => setValue("englishMode", "all")}
            >
                영강만
            </FilterChip>
        );
    }

    if (englishMode === "exclude") {
        activeChips.push(
            <FilterChip
                key="englishExclude"
                onRemove={() => setValue("englishMode", "all")}
            >
                영강 제외
            </FilterChip>
        );
    }

    return (
        <section className="filter-panel">
            <div className="search-filter-row">
                <input
                    className="main-search-input"
                    value={filters.keyword}
                    placeholder="검색어를 입력하세요"
                    onChange={(event) => setValue("keyword", event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            setValue("keyword", filters.keyword.trim());
                        }
                    }}
                />

                <button
                    type="button"
                    className="main-search-button"
                    onClick={() => setValue("keyword", filters.keyword.trim())}
                >
                    검색
                </button>

                <div className="search-target-chips">
                    {SEARCH_TARGETS.map((target) => (
                        <SearchTargetChip
                            key={target.value}
                            active={searchTarget === target.value}
                            onClick={() => setValue("searchTarget", target.value)}
                        >
                            {target.label}
                        </SearchTargetChip>
                    ))}
                </div>
            </div>

            <div className="filter-main-row">
                <label
                    className={`filter-field ${
                        filters.college.enabled && !isGeneralSelected ? "" : "filter-muted"
                    }`}
                >
                    <span>대학</span>

                    <select
                        value={filters.college.value}
                        onChange={(event) => setCollege(event.target.value)}
                        disabled={isGeneralSelected}
                    >
                        <option value="">전체 대학</option>

                        {collegeOptions.map((college) => (
                            <option key={college} value={college}>
                                {college}
                            </option>
                        ))}
                    </select>

                    <FilterApplyToggle
                        enabled={filters.college.enabled && !isGeneralSelected}
                        disabled={isGeneralSelected || !filters.college.value}
                        onClick={toggleCollegeEnabled}
                    />
                </label>

                <label
                    className={`filter-field ${
                        filters.department.enabled ? "" : "filter-muted"
                    }`}
                >
                    <span>{isGeneralSelected ? "영역" : "학과"}</span>

                    <select
                        value={departmentSelectValue}
                        onChange={(event) => setDepartment(event.target.value)}
                    >
                        <option value="">
                            {isGeneralSelected ? "전체 영역" : "전체 학과"}
                        </option>

                        {isGeneralSelected
                            ? generalAreaOptions.map((area) => (
                                <option key={area} value={area}>
                                    {area}
                                </option>
                            ))
                            : departmentOptions.map((item) => (
                                <option
                                    key={`${item.college}-${item.department}`}
                                    value={item.department}
                                >
                                    {item.department}
                                    {!filters.college.value && item.college
                                        ? ` (${item.college})`
                                        : ""}
                                </option>
                            ))}
                    </select>

                    <FilterApplyToggle
                        enabled={filters.department.enabled}
                        disabled={!departmentSelectValue}
                        onClick={toggleDepartmentEnabled}
                    />
                </label>

                <div className="filter-inline-chip-group">
                    <span>이수구분</span>

                    <div className="detail-chip-row">
                        {courseTypeOptions.map((type) => (
                            <OptionChip
                                key={type}
                                active={selectedCourseTypes.includes(type)}
                                onClick={() => toggleCourseType(type)}
                            >
                                {type}
                            </OptionChip>
                        ))}
                    </div>
                </div>

                <button
                    type="button"
                    className={`detail-toggle ${filters.detailsOpen ? "open" : ""}`}
                    onClick={() => setValue("detailsOpen", !filters.detailsOpen)}
                >
                    + 상세
                </button>
            </div>

            {filters.detailsOpen && (
                <div className="detail-filter-panel detail-filter-layout">
                    <div className="detail-left-groups">
                        <DetailGroup title="학점">
                            {creditOptions.length > 0 ? (
                                creditOptions.map((credit) => (
                                    <OptionChip
                                        key={credit}
                                        active={filters.credit === credit}
                                        onClick={() =>
                                            setValue("credit", filters.credit === credit ? "" : credit)
                                        }
                                    >
                                        {credit}학점
                                    </OptionChip>
                                ))
                            ) : (
                                <span className="detail-empty-text">학점 정보 없음</span>
                            )}
                        </DetailGroup>

                        <DetailGroup title="수업 특성">
                            <OptionChip
                                active={filters.excludeDropRestricted}
                                onClick={() => toggleBoolean("excludeDropRestricted")}
                            >
                                수강포기제한 제외
                            </OptionChip>

                            <OptionChip
                                active={filters.onlyMooc}
                                onClick={() => toggleBoolean("onlyMooc")}
                            >
                                MOOC
                            </OptionChip>

                            <OptionChip
                                active={filters.onlyFlexible}
                                onClick={() => toggleBoolean("onlyFlexible")}
                            >
                                유연학기
                            </OptionChip>

                            <OptionChip
                                active={filters.onlyRemote}
                                onClick={() => toggleBoolean("onlyRemote")}
                            >
                                원격/녹강
                            </OptionChip>

                            <OptionChip
                                active={englishMode === "only"}
                                onClick={() =>
                                    setValue("englishMode", englishMode === "only" ? "all" : "only")
                                }
                            >
                                영강만
                            </OptionChip>

                            <OptionChip
                                active={englishMode === "exclude"}
                                onClick={() =>
                                    setValue(
                                        "englishMode",
                                        englishMode === "exclude" ? "all" : "exclude"
                                    )
                                }
                            >
                                영강 제외
                            </OptionChip>
                        </DetailGroup>
                    </div>

                    <div className="detail-right-time">
                        <div className="mini-time-panel-title">시간대 직접 선택</div>

                        <MiniTimeFilter
                            timeSlots={timeSlots}
                            onToggleCell={toggleTimeSlot}
                            onToggleDay={toggleTimeSlotDay}
                            onTogglePeriod={toggleTimeSlotPeriod}
                        />
                    </div>
                </div>
            )}

            <div className="active-filter-row active-filter-row-bottom">
                {activeChips.length > 0 ? (
                    activeChips
                ) : (
                    <span className="empty-filter-hint">
            선택된 검색 조건이 없습니다.
          </span>
                )}
            </div>
        </section>
    );
}

export default FilterPanel;
