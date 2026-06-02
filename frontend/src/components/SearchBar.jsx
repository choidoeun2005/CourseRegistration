import Button from "./Button.jsx";

function SearchBar({ keyword, onChange, onSearch, onClear }) {
    return (
        <div className="search-bar">
            <div className="search-input-wrap">
                <input
                    value={keyword}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onSearch()}
                    placeholder="교과목 / 학수번호 / 교수명 검색"
                />
                {keyword && (
                    <button className="search-clear-btn" onClick={onClear} tabIndex={-1}>
                        ✕
                    </button>
                )}
            </div>
            <Button variant="primary" onClick={onSearch}>
                검색
            </Button>
        </div>
    );
}

export default SearchBar;
